import '../config/env';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';

if(process.env.NODE_ENV==='production'&&(!process.env.JWT_SECRET||Buffer.byteLength(process.env.JWT_SECRET)<32||process.env.JWT_SECRET==='maha-market-secret-jwt-key-2026'))throw new Error('Configure a non-default JWT_SECRET of at least 32 bytes before starting production.');
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');
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
  const payload=jwt.verify(token, JWT_SECRET, {algorithms:['HS256']});
  // Undefined tenant filters are omitted by Prisma. Never let an old/unscoped
  // signed token reach owner-filtered queries with partyId missing.
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(typeof payload==='string'||typeof payload.userId!=='string'||typeof payload.partyId!=='string'||!uuid.test(payload.partyId)||!Array.isArray(payload.roles)||!payload.roles.length||!payload.roles.every((role:unknown)=>typeof role==='string'))throw new Error('Session is missing a valid workspace identity. Please sign in again.');
  return payload as unknown as TokenPayload;
};
