import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'maha-market-secret-jwt-key-2026';

export enum PartyRole {
  FARMER = 'FARMER',
  FPO_ADMIN = 'FPO_ADMIN',
  BUYER = 'BUYER',
  STORAGE_OPERATOR = 'STORAGE_OPERATOR',
  TRANSPORT_OPERATOR = 'TRANSPORT_OPERATOR',
  EQUIPMENT_PROVIDER = 'EQUIPMENT_PROVIDER',
  LABOR_CONTRACTOR = 'LABOR_CONTRACTOR',
  INPUT_SUPPLIER = 'INPUT_SUPPLIER',
  DISTRICT_ADMIN = 'DISTRICT_ADMIN',
  STATE_ADMIN = 'STATE_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

export interface AuthUser {
  userId: string;
  partyId?: string;
  phone: string;
  roles: PartyRole[];
  district?: string;
}

export interface GuardResult {
  isAuthorized: boolean;
  user?: AuthUser;
  errorResponse?: NextResponse;
}

export function authorizeNextApiRoute(
  req: NextRequest,
  allowedRoles?: PartyRole[]
): GuardResult {
  const authHeader = req.headers.get('authorization');
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return {
      isAuthorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      ),
    };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;

    if (allowedRoles && allowedRoles.length > 0) {
      const userRoles = payload.roles || [];
      const hasPermission = allowedRoles.some((role) => userRoles.includes(role));

      if (!hasPermission) {
        return {
          isAuthorized: false,
          user: payload,
          errorResponse: NextResponse.json(
            {
              success: false,
              error: `Forbidden: Required role(s) [${allowedRoles.join(', ')}]. User roles: [${userRoles.join(', ')}]`,
            },
            { status: 403 }
          ),
        };
      }
    }

    return {
      isAuthorized: true,
      user: payload,
    };
  } catch (error) {
    return {
      isAuthorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      ),
    };
  }
}
