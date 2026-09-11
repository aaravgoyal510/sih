// Private objects are accessed only by authenticated, scoped workspace routes.
// Never return the service key or a public/signed storage URL to the browser.
export const DOCUMENT_BUCKET = 'verification-documents';
export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
export class StorageFailure extends Error { status = 503; }
const failure = () => new StorageFailure('Private document storage is unavailable. Please try again later.');
async function storage(path: string, options: RequestInit = {}) {
  const origin = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!origin || !key || new URL(origin).protocol !== 'https:') throw failure();
  try {
    return await fetch(`${origin.replace(/\/$/, '')}/storage/v1/${path}`, {
      ...options, redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { apikey: key, Authorization: `Bearer ${key}`, ...options.headers },
    });
  } catch { throw failure(); }
}
async function ensurePrivateBucket() {
  let response = await storage(`bucket/${DOCUMENT_BUCKET}`);
  if (!response.ok) {
    const missing: any = await response.json().catch(() => null);
    if (response.status !== 404 && String(missing?.statusCode) !== '404') throw failure();
    const created = await storage('bucket', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      id:DOCUMENT_BUCKET,name:DOCUMENT_BUCKET,public:false,file_size_limit:MAX_DOCUMENT_BYTES,allowed_mime_types:['image/png','image/jpeg','application/pdf'],
    })});
    // A concurrent first upload may have created it. Re-read and verify privacy.
    if (!created.ok && created.status !== 409 && created.status !== 400) throw failure();
    response = await storage(`bucket/${DOCUMENT_BUCKET}`);
  }
  const bucket: any = await response.json().catch(() => null);
  if (!response.ok || bucket?.public !== false) throw failure();
}
export function documentExtension(bytes: Buffer, mime: string) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_DOCUMENT_BYTES) return null;
  if (mime === 'image/png' && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (mime === 'application/pdf' && bytes.subarray(0,5).toString() === '%PDF-') return 'pdf';
  return null;
}
export function storageObjectPath(reference: string, partyId: string) {
  const prefix = `storage://${DOCUMENT_BUCKET}/${partyId}/`;
  if (!reference.startsWith(prefix)) return null;
  const filename = reference.slice(prefix.length);
  return /^[a-f0-9-]{36}-[a-f0-9]{64}\.(png|jpg|pdf)$/.test(filename) ? `${partyId}/${filename}` : null;
}
export async function uploadDocument(path: string, bytes: Buffer, mime: string) {
  await ensurePrivateBucket();
  const response = await storage(`object/${DOCUMENT_BUCKET}/${path}`, {method:'POST',headers:{'Content-Type':mime,'x-upsert':'true'},body:new Uint8Array(bytes)});
  if (!response.ok) throw failure();
}
export async function downloadDocument(path: string) {
  const response = await storage(`object/${DOCUMENT_BUCKET}/${path}`);
  if (!response.ok) throw failure();
  const buffer = Buffer.from(await response.arrayBuffer());
  const mime = path.endsWith('.pdf')?'application/pdf':path.endsWith('.png')?'image/png':'image/jpeg';
  if (!documentExtension(buffer,mime)) throw failure();
  return {buffer,mime};
}
