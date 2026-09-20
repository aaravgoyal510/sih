import { prisma } from '../config/prisma';
import { liveMarket } from './live-market.service';

export type ChannelLanguage = 'en' | 'hi' | 'mr';

export interface WhatsAppMessageResult {
  fromPhone: string;
  intentRecognized: 'CHECK_PRICE' | 'MY_OFFERS' | 'SELL_CROP' | 'UNKNOWN';
  languageDetected?: ChannelLanguage;
  cropDetected?: string;
  districtDetected?: string;
  replyText: string;
  channel: 'WHATSAPP' | 'SMS';
}

export class WhatsappSmsChannelService {
  /**
   * Detect language from inbound message text, falling back to null if ambiguous
   */
  private detectMessageLanguage(text: string): ChannelLanguage | null {
    const hindiMarkers = ['दाम', 'कीमत', 'मेरे', 'मेरी', 'मेरा', 'बेचना', 'बिक्री', 'मदद', 'प्याज', 'टमाटर', 'किसान', 'जिला', 'भुगतान', 'दर'];
    const marathiMarkers = ['माझे', 'माझ्या', 'विक्री', 'कांदा', 'टोमॅटो', 'सोयाबीन', 'मदत', 'शेती', 'जिल्हा', 'विका', 'पेमेंट'];

    let hindiScore = 0;
    let marathiScore = 0;

    for (const marker of hindiMarkers) {
      if (text.includes(marker)) hindiScore++;
    }
    for (const marker of marathiMarkers) {
      if (text.includes(marker)) marathiScore++;
    }

    if (hindiScore > marathiScore) return 'hi';
    if (marathiScore > hindiScore) return 'mr';

    // If Devanagari script is present but no unique marker (e.g., just "भाव")
    if (/[\u0900-\u097F]/.test(text)) {
      if (text.includes('भाव')) return 'mr';
      return 'hi';
    }

    // English keywords
    const englishMarkers = ['PRICE', 'RATE', 'OFFER', 'OFFERS', 'BOOKING', 'SELL', 'HELP', 'CROP'];
    const upper = text.toUpperCase();
    if (englishMarkers.some((m) => upper.includes(m))) {
      return 'en';
    }

    return null;
  }

  /**
   * Resolve language: (a) inbound message -> (b) user preferredLang -> (c) 'en'
   */
  private async resolveLanguage(fromPhone: string, text: string): Promise<ChannelLanguage> {
    const detected = this.detectMessageLanguage(text);
    if (detected) return detected;

    const user = await prisma.user.findUnique({
      where: { phone: fromPhone },
      select: { preferredLang: true },
    });

    if (user?.preferredLang === 'mr' || user?.preferredLang === 'hi') {
      return user.preferredLang;
    }

    return 'en';
  }

  /**
   * Process incoming WhatsApp / SMS message text and route to backend services
   */
  public async handleIncomingMessage(fromPhone: string, messageBody: string): Promise<WhatsAppMessageResult> {
    const rawText = messageBody.trim();
    const textUpper = rawText.toUpperCase();
    const cleanPhone = fromPhone.replace('whatsapp:', '').trim();

    const lang = await this.resolveLanguage(cleanPhone, rawText);

    // 1. Intent: CHECK_PRICE (e.g., "PRICE ONION NASHIK", "CHECK PRICE TOMATO PUNE", "भाव कांदा नाशिक", "दाम प्याज नाशिक")
    if (
      textUpper.includes('PRICE') ||
      textUpper.includes('RATE') ||
      rawText.includes('भाव') ||
      rawText.includes('दाम') ||
      rawText.includes('कीमत') ||
      rawText.includes('दर')
    ) {
      return this.handlePriceCheckIntent(cleanPhone, rawText, textUpper, lang);
    }

    // 2. Intent: MY_OFFERS (e.g., "MY OFFERS", "OFFERS", "माझे ऑफर्स", "मेरे प्रस्ताव")
    if (
      textUpper.includes('OFFER') ||
      textUpper.includes('BOOKING') ||
      rawText.includes('माझे') ||
      rawText.includes('माझ्या') ||
      rawText.includes('मेरे') ||
      rawText.includes('मेरी') ||
      rawText.includes('प्रस्ताव') ||
      rawText.includes('ऑफर')
    ) {
      return this.handleMyOffersIntent(cleanPhone, lang);
    }

    // 3. Intent: SELL_CROP (e.g., "SELL ONION 1000 KG", "विक्री", "बेचना")
    if (
      textUpper.includes('SELL') ||
      textUpper.includes('CROP LOT') ||
      rawText.includes('विक्री') ||
      rawText.includes('बेचना') ||
      rawText.includes('बिक्री') ||
      rawText.includes('विका')
    ) {
      return this.handleSellCropIntent(cleanPhone, rawText, lang);
    }

    // Default Fallback / Help Menu
    let replyText = `🌾 *KrishiSetu Linkage Bot* 🌾\n\nMain Menu (4 Top-Level Actions):\n1️⃣ Reply *PRICE <CROP> <DISTRICT>* (e.g. *PRICE ONION NASHIK*) to check mandi rates.\n2️⃣ Reply *MY OFFERS* to view active offers & escrow payments.\n3️⃣ Reply *SELL <CROP> <QTY_KG>* to post a crop lot.\n4️⃣ Reply *HELP* for services directory.`;

    if (lang === 'hi') {
      replyText = `🌾 *कृषिसेतु लिंकेज बॉट* 🌾\n\nमुख्य मेनू (4 प्रमुख क्रियाएँ):\n1️⃣ मंडी भाव जानने के लिए *PRICE <CROP> <DISTRICT>* (उदा. *PRICE ONION NASHIK* या *दाम प्याज नाशिक*) लिखकर भेजें।\n2️⃣ सक्रिय प्रस्ताव और एस्क्रो भुगतान देखने के लिए *MY OFFERS* (या *मेरे प्रस्ताव*) लिखकर भेजें।\n3️⃣ फसल लॉट दर्ज करने के लिए *SELL <CROP> <QTY_KG>* (उदा. *SELL ONION 1000*) लिखकर भेजें।\n4️⃣ सेवा निर्देशिका के लिए *HELP* (या *मदद*) लिखकर भेजें।`;
    } else if (lang === 'mr') {
      replyText = `🌾 *कृषीसेतू लिंकेज बॉट* 🌾\n\nमुख्य मेनू (4 प्रमुख कृती):\n1️⃣ मार्केट यार्ड भाव पाहण्यासाठी *PRICE <CROP> <DISTRICT>* (उदा. *PRICE ONION NASHIK* किंवा *भाव कांदा नाशिक*) पाठवा.\n2️⃣ सक्रिय ऑफर्स आणि एस्क्रो पेमेंट पाहण्यासाठी *MY OFFERS* (किंवा *माझे ऑफर्स*) पाठवा.\n3️⃣ पीक लॉट नोंदवण्यासाठी *SELL <CROP> <QTY_KG>* (उदा. *SELL ONION 1000*) पाठवा.\n4️⃣ सेवा मार्गदर्शिकेसाठी *HELP* (किंवा *मदत*) पाठवा.`;
    }

    return {
      fromPhone: cleanPhone,
      intentRecognized: 'UNKNOWN',
      languageDetected: lang,
      channel: 'WHATSAPP',
      replyText,
    };
  }

  private async handlePriceCheckIntent(
    fromPhone: string,
    rawText: string,
    textUpper: string,
    lang: ChannelLanguage
  ): Promise<WhatsAppMessageResult> {
    // Parse crop
    let crop = 'Onion';
    if (textUpper.includes('TOMATO') || rawText.includes('टोमॅटो') || rawText.includes('टमाटर')) crop = 'Tomato';
    else if (textUpper.includes('SOYBEAN') || rawText.includes('सोयाबीन')) crop = 'Soybean';
    else if (textUpper.includes('GRAPE') || rawText.includes('द्राक्षे') || rawText.includes('द्राक्ष') || rawText.includes('अंगूर')) crop = 'Grape';
    else if (textUpper.includes('POMEGRANATE') || rawText.includes('डाळिंब') || rawText.includes('अनार')) crop = 'Pomegranate';
    else if (textUpper.includes('ONION') || rawText.includes('कांदा') || rawText.includes('प्याज')) crop = 'Onion';

    // Parse district
    let district = 'Nashik';
    if (textUpper.includes('PUNE') || rawText.includes('पुणे')) district = 'Pune';
    else if (textUpper.includes('AHMEDNAGAR') || rawText.includes('अहमदनगर') || rawText.includes('अहिल्यानगर')) district = 'Ahmednagar';
    else if (textUpper.includes('LATUR') || rawText.includes('लातूर')) district = 'Latur';
    else if (textUpper.includes('NAGPUR') || rawText.includes('नागपूर')) district = 'Nagpur';
    else if (textUpper.includes('SOLAPUR') || rawText.includes('सोलापूर')) district = 'Solapur';
    else if (textUpper.includes('NASHIK') || rawText.includes('नाशिक') || rawText.includes('नासिक')) district = 'Nashik';

    // Query MandiPrice table
    const feed = await liveMarket.get();
    const latestPrice = feed.prices.find(
      (p) => p.crop.toLowerCase() === crop.toLowerCase() && p.district.toLowerCase() === district.toLowerCase()
    );

    if (!latestPrice) {
      let replyText = `⚠️ *No Live Mandi Data Available*\nCrop: ${crop}\nDistrict: ${district}\nNo active mandi prices logged for this crop/district combination yet.`;
      if (lang === 'hi') {
        replyText = `⚠️ *लाइव मंडी भाव उपलब्ध नहीं हैं*\nफसल: ${crop}\nजिला: ${district}\nइस फसल/जिले के लिए अभी कोई सक्रिय मंडी भाव दर्ज नहीं है।`;
      } else if (lang === 'mr') {
        replyText = `⚠️ *थेट मार्केट यार्ड भाव उपलब्ध नाहीत*\nपीक: ${crop}\nजिल्हा: ${district}\nया पिकासाठी/जिल्ह्यासाठी अद्याप थेट भाव नोंदवलेले नाहीत.`;
      }

      return {
        fromPhone,
        intentRecognized: 'CHECK_PRICE',
        languageDetected: lang,
        cropDetected: crop,
        districtDetected: district,
        channel: 'WHATSAPP',
        replyText,
      };
    }

    const priceQuintal = (latestPrice.pricePerKg * 100).toFixed(0);

    let replyText = `KrishiSetu market prices\nCrop: ${crop}\nDistrict: ${district}\nMarket: ${latestPrice.market}\nPrice: INR ${latestPrice.pricePerKg.toFixed(2)}/kg (INR ${priceQuintal}/quintal)\nObserved: ${latestPrice.recordedAt.slice(0, 10)}\nStatus: ${feed.mode}\n${feed.warning || 'Mean reported modal price across varieties/grades.'}`;

    if (lang === 'hi') {
      replyText = `कृषिसेतु मंडी भाव\nफसल: ${crop}\nजिला: ${district}\nबाजार: ${latestPrice.market}\nभाव: ₹${latestPrice.pricePerKg.toFixed(2)}/किलो (₹${priceQuintal}/क्विंटल)\nतारीख: ${latestPrice.recordedAt.slice(0, 10)}\nस्थिति: ${feed.mode}\n${feed.warning || 'विभिन्न किस्मों/ग्रेडों में दर्ज औसत मोडल भाव।'}`;
    } else if (lang === 'mr') {
      replyText = `कृषीसेतू मार्केट यार्ड भाव\nपीक: ${crop}\nजिल्हा: ${district}\nबाजार: ${latestPrice.market}\nभाव: ₹${latestPrice.pricePerKg.toFixed(2)}/किलो (₹${priceQuintal}/क्विंटल)\nनोंद तारीख: ${latestPrice.recordedAt.slice(0, 10)}\nस्थिती: ${feed.mode}\n${feed.warning || 'विविध प्रकार/दर्जांमधील नोंदवलेला सरासरी मोडल भाव.'}`;
    }

    return {
      fromPhone,
      intentRecognized: 'CHECK_PRICE',
      languageDetected: lang,
      cropDetected: crop,
      districtDetected: district,
      channel: 'WHATSAPP',
      replyText,
    };
  }

  private async handleMyOffersIntent(fromPhone: string, lang: ChannelLanguage): Promise<WhatsAppMessageResult> {
    const party = await prisma.party.findFirst({
      where: { user: { phone: fromPhone } },
      include: {
        listings: {
          include: {
            offers: {
              include: { booking: true },
            },
          },
        },
      },
    });

    if (!party || party.listings.length === 0) {
      let replyText = `📲 *My Offers & Payments*\nFarmer: ${party ? party.name : fromPhone}\nNo active listings or offers found. Reply *SELL ONION 1000* to create your first crop lot listing!`;
      if (lang === 'hi') {
        replyText = `📲 *मेरे प्रस्ताव और भुगतान*\nकिसान: ${party ? party.name : fromPhone}\nकोई सक्रिय लिस्टिंग या प्रस्ताव नहीं मिला। अपनी पहली फसल लिस्टिंग बनाने के लिए *SELL ONION 1000* लिखकर भेजें!`;
      } else if (lang === 'mr') {
        replyText = `📲 *माझे ऑफर्स आणि पेमेंट्स*\nशेतकरी: ${party ? party.name : fromPhone}\nकोणतीही सक्रिय नोंदणी किंवा ऑफर आढळली नाही. तुमची पहिली पीक नोंदणी करण्यासाठी *SELL ONION 1000* पाठवा!`;
      }

      return {
        fromPhone,
        intentRecognized: 'MY_OFFERS',
        languageDetected: lang,
        channel: 'WHATSAPP',
        replyText,
      };
    }

    let replyText = '';
    if (lang === 'hi') {
      replyText = `📲 *मेरे प्रस्ताव और भुगतान*\nकिसान: *${party.name}* (${party.district})\n\n`;
      party.listings.forEach((listing, idx) => {
        const attrs = (listing.attributes as any) || {};
        const title = attrs.crop || this.getResourceDisplayName(listing.resourceType, 'hi');
        const qtyStr = this.formatQuantity(listing.resourceType, attrs);
        const qtySuffix = qtyStr ? ` (${qtyStr})` : '';
        replyText += `लिस्टिंग #${idx + 1}: *${title}*${qtySuffix}\n`;
        if (listing.offers.length === 0) {
          replyText += `  └ स्थिति: ${listing.status} | खरीदार मिलने की प्रतीक्षा...\n\n`;
        } else {
          listing.offers.forEach((off) => {
            replyText += `  └ प्रस्ताव: ₹${off.price}/किलो | स्थिति: *${off.status}*\n`;
            if (off.booking) {
              replyText += `    └ एस्क्रो भुगतान: *${off.booking.paymentStatus}* (₹${off.booking.totalAmount})\n`;
            }
          });
          replyText += '\n';
        }
      });
    } else if (lang === 'mr') {
      replyText = `📲 *माझे ऑफर्स आणि पेमेंट्स*\nशेतकरी: *${party.name}* (${party.district})\n\n`;
      party.listings.forEach((listing, idx) => {
        const attrs = (listing.attributes as any) || {};
        const title = attrs.crop || this.getResourceDisplayName(listing.resourceType, 'mr');
        const qtyStr = this.formatQuantity(listing.resourceType, attrs);
        const qtySuffix = qtyStr ? ` (${qtyStr})` : '';
        replyText += `नोंदणी #${idx + 1}: *${title}*${qtySuffix}\n`;
        if (listing.offers.length === 0) {
          replyText += `  └ स्थिती: ${listing.status} | खरेदीदार जुळण्याची प्रतीक्षा...\n\n`;
        } else {
          listing.offers.forEach((off) => {
            replyText += `  └ ऑफर: ₹${off.price}/किलो | स्थिती: *${off.status}*\n`;
            if (off.booking) {
              replyText += `    └ एस्क्रो पेमेंट: *${off.booking.paymentStatus}* (₹${off.booking.totalAmount})\n`;
            }
          });
          replyText += '\n';
        }
      });
    } else {
      replyText = `📲 *My Offers & Payments*\nFarmer: *${party.name}* (${party.district})\n\n`;
      party.listings.forEach((listing, idx) => {
        const attrs = (listing.attributes as any) || {};
        const title = attrs.crop || this.getResourceDisplayName(listing.resourceType, 'en');
        const qtyStr = this.formatQuantity(listing.resourceType, attrs);
        const qtySuffix = qtyStr ? ` (${qtyStr})` : '';
        replyText += `Listing #${idx + 1}: *${title}*${qtySuffix}\n`;
        if (listing.offers.length === 0) {
          replyText += `  └ Status: ${listing.status} | Waiting for buyer matches...\n\n`;
        } else {
          listing.offers.forEach((off) => {
            replyText += `  └ Offer: ₹${off.price}/kg | Status: *${off.status}*\n`;
            if (off.booking) {
              replyText += `    └ Escrow Payment: *${off.booking.paymentStatus}* (Rs ${off.booking.totalAmount})\n`;
            }
          });
          replyText += '\n';
        }
      });
    }

    return {
      fromPhone,
      intentRecognized: 'MY_OFFERS',
      languageDetected: lang,
      channel: 'WHATSAPP',
      replyText,
    };
  }

  private async handleSellCropIntent(fromPhone: string, rawText: string, lang: ChannelLanguage): Promise<WhatsAppMessageResult> {
    let replyText = `Crop draft request received: "${rawText}". Nothing has been published. Open KrishiSetu, choose Sell my crop, review quantity and price, then explicitly publish. This channel has no confirmed buyer quote or net-realization estimate.`;

    if (lang === 'hi') {
      replyText = `फसल ड्राफ्ट अनुरोध प्राप्त: "${rawText}"। अभी कुछ भी प्रकाशित नहीं हुआ है। कृषिसेतु खोलें, 'मेरी फसल बेचें' चुनें, मात्रा और भाव की समीक्षा करें, फिर स्पष्ट रूप से प्रकाशित करें। इस चैनल पर कोई पक्का खरीदार भाव या शुद्ध प्राप्ति अनुमान नहीं है।`;
    } else if (lang === 'mr') {
      replyText = `पीक मसुदा विनंती प्राप्त झाली: "${rawText}". अद्याप काहीही प्रकाशित झालेले नाही. कृषीसेतू उघडा, 'माझे पीक विका' निवडा, प्रमाण आणि भावाची खात्री करा, नंतर स्पष्टपणे प्रकाशित करा. या चॅनेलवर कोणताही निश्चित खरेदीदार भाव किंवा निव्वळ रकमेचा अंदाज नाही.`;
    }

    return {
      fromPhone,
      intentRecognized: 'SELL_CROP',
      languageDetected: lang,
      channel: 'WHATSAPP',
      replyText,
    };
  }

  private getResourceDisplayName(resourceType: string, lang: ChannelLanguage = 'en'): string {
    const map: Record<string, { en: string; hi: string; mr: string }> = {
      COLD_STORAGE: { en: 'Cold Storage', hi: 'कोल्ड स्टोरेज', mr: 'कोल्ड स्टोरेज' },
      TRANSPORT: { en: 'Transport', hi: 'परिवहन', mr: 'वाहतूक' },
      EQUIPMENT_SERVICE: { en: 'Equipment', hi: 'उपकरण', mr: 'यंत्रसामग्री' },
      LABOR: { en: 'Labor Crew', hi: 'श्रमिक दल', mr: 'मजूर पथक' },
      CONTRACT_FARMING: { en: 'Contract Farming', hi: 'अनुबंध खेती', mr: 'करार शेती' },
      INPUT_GROUP_BUY: { en: 'Input Group Buy', hi: 'इनपुट समूह खरीद', mr: 'इनपुट गट खरेदी' },
      USED_EQUIPMENT: { en: 'Used Equipment', hi: 'पुराने उपकरण', mr: 'जुनी यंत्रसामग्री' },
      CROP_LOT: { en: 'Crop Lot', hi: 'फसल लॉट', mr: 'पीक लॉट' },
    };
    const entry = map[resourceType];
    if (entry) {
      return entry[lang] || entry.en;
    }
    return resourceType
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  private formatQuantity(resourceType: string, attrs: any): string {
    if (attrs.quantityKg != null && attrs.quantityKg !== '') return `${attrs.quantityKg} kg`;
    if (attrs.targetQuantity != null && attrs.targetQuantity !== '') return `${attrs.targetQuantity} units`;
    if (attrs.capacityQuintal != null && attrs.capacityQuintal !== '') return `${attrs.capacityQuintal} quintal`;
    if (attrs.capacityKg != null && attrs.capacityKg !== '') return `${attrs.capacityKg} kg`;
    if (attrs.crewSize != null && attrs.crewSize !== '') return `${attrs.crewSize} workers`;
    return '';
  }
}

export const whatsappSmsChannelService = new WhatsappSmsChannelService();
