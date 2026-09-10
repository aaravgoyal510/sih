/**
 * OTP Verification Mechanism for Dev & Production:
 * 1. Production Mode:
 *    - OTP is generated dynamically (6 digits) and dispatched via external SMS/WhatsApp API.
 *    - The API response DOES NOT return the code to the client.
 * 2. Development & Automated Testing Mode (NODE_ENV !== 'production' || DEMO_MODE === 'true'):
 *    - Server emits `[DEV OTP LOG] Phone: +91..., Code: XXXXXX` to stdout/logs.
 *    - Universal testing passcode `123456` is enabled for instant automated tests and visual demo flows.
 */

interface OtpEntry {
  code: string;
  expiresAt: number;
}

const otpStore = new Map<string, OtpEntry>();

export const generateOtp = (phone: string): string => {
  const isDevOrTest = process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true';
  const code = isDevOrTest ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

  otpStore.set(phone, { code, expiresAt });

  if (isDevOrTest) {
    console.log(`[DEV OTP LOG] Dispatched OTP for Phone: ${phone} -> Code: ${code} (Use code '${code}' or '123456' to verify)`);
  }

  return code;
};

export const verifyOtpCode = (phone: string, code: string): boolean => {
  const isDevOrTest = process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true';

  // Dev & Test fallback passcode '123456'
  if (isDevOrTest && code === '123456') {
    return true;
  }

  const entry = otpStore.get(phone);
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return false;
  }

  if (entry.code === code) {
    otpStore.delete(phone);
    return true;
  }

  return false;
};
