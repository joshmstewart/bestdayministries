-- Delete duplicate Gregory receipt (created at 18:20 from checkout.session.completed)
-- Keeping the later one at 18:27 from invoice.payment_succeeded
DELETE FROM public.sponsorship_receipts 
WHERE id = '6b23e7ba-a507-4a30-848c-78653625a6b4'
AND receipt_number = 'RCP-1759775223224-0ULG4';