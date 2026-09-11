import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'maha-market-secret-jwt-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  partyId?: string;
  phone: string;
  roles: string[];
  district?: string;
}

export const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
