-- Add 'in_production' to the fulfillment_status enum
ALTER TYPE fulfillment_status ADD VALUE IF NOT EXISTS 'in_production' AFTER 'pending';