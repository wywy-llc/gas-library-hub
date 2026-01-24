-- Add structured usage_example column (jsonb) for UsageExampleAnnotated format
ALTER TABLE "library_summary" ADD COLUMN "usage_example" jsonb;
