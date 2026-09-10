import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { PartyRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
    return;
  }
};

export const requireRoles = (...allowedRoles: (PartyRole | string)[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: User authentication required' });
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Access denied. Required role(s): [${allowedRoles.join(', ')}]. User roles: [${userRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
};
