-- Unschedule the year-end summaries cron job to prevent automated sends
SELECT cron.unschedule('send-year-end-summaries-daily');

-- Delete incorrect 2025 year-end summary records (wrong amounts from sponsorship_receipts)
DELETE FROM year_end_summary_sent WHERE tax_year = 2025;