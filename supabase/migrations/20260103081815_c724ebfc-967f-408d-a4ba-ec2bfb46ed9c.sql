-- Add unique constraints for upsert operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_donation_stripe_trans_invoice_mode 
ON donation_stripe_transactions (stripe_invoice_id, stripe_mode) 
WHERE stripe_invoice_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_donation_stripe_trans_charge_mode 
ON donation_stripe_transactions (stripe_charge_id, stripe_mode) 
WHERE stripe_charge_id IS NOT NULL;