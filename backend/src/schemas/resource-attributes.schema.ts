import { z } from 'zod';
import { ResourceType } from '@prisma/client';

export const CropLotAttributeSchema = z.object({
  crop: z.string().min(1, 'Crop name is required'),
  quantityKg: z.number().positive('Quantity must be greater than 0'),
  qualityGrade: z.enum(['A', 'B', 'C']),
  photoUrls: z.array(z.string().url()).optional(),
  moisturePercentage: z.number().positive().optional(),
  isPooled: z.boolean().optional(),
  pooledFromListingIds: z.array(z.string()).optional(),
  participatingFarmerCount: z.number().int().positive().optional(),
});

export const ColdStorageAttributeSchema = z.object({
  capacityQuintal: z.number().positive('Capacity must be greater than 0'),
  cropSuitability: z.array(z.string().min(1)).min(1, 'At least one suitable crop required'),
  tempRange: z.string().optional(),
});

export const TransportAttributeSchema = z.object({
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  capacityKg: z.number().positive('Capacity must be greater than 0'),
  route: z.object({
    from: z.string().min(1, 'Origin required'),
    to: z.string().min(1, 'Destination required'),
  }),
});

export const EquipmentServiceAttributeSchema = z.object({
  machineType: z.string().min(1),
  packageType: z.string().min(1),
  includesOperator: z.boolean(),
});

export const LaborAttributeSchema = z.object({
  crewSize: z.number().int().positive(),
  taskType: z.string().min(1),
});

export const UsedEquipmentAttributeSchema = z.object({
  machineType: z.string().min(1),
  conditionGrade: z.enum(['like_new', 'good', 'fair']),
  yearOfPurchase: z.number().int().optional(),
});

export const InputGroupBuyAttributeSchema = z.object({
  inputType: z.string().min(1),
  targetQuantity: z.number().positive(),
});

export const ContractFarmingAttributeSchema = z.object({
  crop: z.string().min(1),
  agreedPricePerKg: z.number().positive(),
  qualitySpec: z.string().min(1),
  seasonWindow: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

export const AttributeSchemas: Record<ResourceType, z.ZodSchema> = {
  [ResourceType.CROP_LOT]: CropLotAttributeSchema,
  [ResourceType.COLD_STORAGE]: ColdStorageAttributeSchema,
  [ResourceType.TRANSPORT]: TransportAttributeSchema,
  [ResourceType.EQUIPMENT_SERVICE]: EquipmentServiceAttributeSchema,
  [ResourceType.LABOR]: LaborAttributeSchema,
  [ResourceType.USED_EQUIPMENT]: UsedEquipmentAttributeSchema,
  [ResourceType.INPUT_GROUP_BUY]: InputGroupBuyAttributeSchema,
  [ResourceType.CONTRACT_FARMING]: ContractFarmingAttributeSchema,
};

export const validateAttributes = (resourceType: ResourceType, attributes: any) => {
  const schema = AttributeSchemas[resourceType];
  if (!schema) {
    throw new Error(`No validation schema registered for resourceType: ${resourceType}`);
  }
  return schema.parse(attributes);
};
