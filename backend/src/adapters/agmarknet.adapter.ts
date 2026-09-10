import https from 'https';
import { prisma } from '../config/prisma';
import { PortalAdapter, SyncResult } from './portal-adapter.interface';

export class AgmarknetAdapter implements PortalAdapter {
  public portalName = 'AGMARKNET';
  public tier = 1; // Tier 1 = Live integration per TechSpec.md §6

  private apiKey: string;
  private resourceId: string;

  constructor() {
    this.apiKey = process.env.AGMARKNET_API_KEY || '';
    this.resourceId = process.env.AGMARKNET_RESOURCE_ID || '9ef84268-d588-465a-a308-a864a43d0070';
  }

  private fetchPage(offset: number, limit: number, stateFilter: string = 'Maharashtra'): Promise<any> {
    const url = `https://api.data.gov.in/resource/${this.resourceId}?api-key=${this.apiKey}&format=json&limit=${limit}&offset=${offset}&filters[state]=${encodeURIComponent(stateFilter)}`;

    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode !== 200) {
              return reject(new Error(`Data.gov.in API returned HTTP ${res.statusCode}: ${data}`));
            }
            try {
              resolve(JSON.parse(data));
            } catch (err) {
              reject(new Error(`Failed to parse JSON from data.gov.in: ${err}`));
            }
          });
        })
        .on('error', (err) => reject(err));
    });
  }

  private parseArrivalDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const str = dateStr.trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(Date.UTC(year, month, day));
      }
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  public async sync(batchLimit: number = 100): Promise<SyncResult> {
    let recordsFetched = 0;
    let recordsIngested = 0;
    let recordsSkipped = 0;
    let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let errorMessage: string | undefined;

    try {
      if (!this.apiKey) {
        throw new Error('AGMARKNET_API_KEY is not configured in environment variables');
      }

      console.log(`[AGMARKNET SYNC] Fetching records from data.gov.in (Resource: ${this.resourceId})...`);

      // Fetch batch of records from data.gov.in
      const payload = await this.fetchPage(0, batchLimit, 'Maharashtra');
      const records = payload.records || [];
      recordsFetched = records.length;

      console.log(`[AGMARKNET SYNC] Received ${recordsFetched} raw records from data.gov.in.`);

      for (const rec of records) {
        const crop = (rec.commodity || rec.Commodity || 'Unknown').trim();
        const district = (rec.district || rec.District || 'Maharashtra').trim();
        const market = (rec.market || rec.Market || 'APMC').trim();
        const rawModal = typeof rec.modal_price !== 'undefined' ? rec.modal_price : rec.Modal_Price;

        const modalPriceQuintal = parseFloat(rawModal);
        if (isNaN(modalPriceQuintal) || modalPriceQuintal <= 0) {
          recordsSkipped++;
          continue;
        }

        // Unit Normalization: Rs. per Quintal -> Rs. per kg (divide by 100.0)
        const pricePerKg = modalPriceQuintal / 100.0;
        const recordedAt = this.parseArrivalDate(rec.arrival_date || rec.Arrival_Date);

        // Dedup check: check if MandiPrice row already exists for (crop, district, market, recordedAt, source)
        const existing = await prisma.mandiPrice.findFirst({
          where: {
            crop: { equals: crop, mode: 'insensitive' },
            district: { equals: district, mode: 'insensitive' },
            market: { equals: market, mode: 'insensitive' },
            source: 'AGMARKNET',
            recordedAt,
          },
        });

        if (existing) {
          recordsSkipped++;
        } else {
          await prisma.mandiPrice.create({
            data: {
              crop,
              district,
              market,
              pricePerKg,
              source: 'AGMARKNET',
              recordedAt,
            },
          });
          recordsIngested++;
        }
      }
    } catch (err: any) {
      status = 'FAILED';
      errorMessage = err.message || String(err);
      console.error('[AGMARKNET SYNC FAILED]:', errorMessage);
    }

    const summaryMessage = status === 'SUCCESS'
      ? `Agmarknet sync completed: ${recordsFetched} fetched, ${recordsIngested} ingested, ${recordsSkipped} skipped (deduped/invalid).`
      : `Agmarknet sync failed: ${errorMessage}`;

    // Write PortalSyncLog row (Requirements #4 & #7)
    try {
      await prisma.portalSyncLog.create({
        data: {
          portal: 'AGMARKNET',
          tier: 1, // Tier 1 = Live integration
          status,
          message: summaryMessage,
        },
      });
    } catch (logErr) {
      console.error('[AGMARKNET SYNC] Failed to write PortalSyncLog:', logErr);
    }

    return {
      portal: this.portalName,
      tier: this.tier,
      status,
      recordsFetched,
      recordsIngested,
      recordsSkipped,
      message: summaryMessage,
    };
  }
}
