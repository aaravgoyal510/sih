import { Request, Response, NextFunction } from 'express';
import { validateAttributes } from '../schemas/resource-attributes.schema';
import { ResourceType } from '@prisma/client';

export const validateResourceAttributesMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { resourceType, attributes } = req.body;

    if (!resourceType || !Object.values(ResourceType).includes(resourceType)) {
      res.status(400).json({
        success: false,
        error: `Invalid or missing resourceType. Must be one of: [${Object.values(ResourceType).join(', ')}]`,
      });
      return;
    }

    if (!attributes || typeof attributes !== 'object') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid attributes object',
      });
      return;
    }

    const validatedAttributes = validateAttributes(resourceType as ResourceType, attributes);
    req.body.attributes = validatedAttributes;
    next();
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: `Attribute validation failed for resourceType ${req.body?.resourceType}: ${error.message || error}`,
    });
  }
};
