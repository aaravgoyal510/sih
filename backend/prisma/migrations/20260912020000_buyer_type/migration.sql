-- Additive classification only. It does not alter authorization roles, data,
-- trust history or existing buyer records; null means not yet classified.
DO $upgrade$
BEGIN
  BEGIN
    CREATE TYPE "BuyerType" AS ENUM ('LOCAL', 'BULK');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "buyerType" "BuyerType";
  CREATE INDEX IF NOT EXISTS "Party_buyerType_idx" ON "Party"("buyerType");
END $upgrade$;
