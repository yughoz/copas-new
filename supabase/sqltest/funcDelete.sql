-- Enable pg_cron extension (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Create scheduled job to run every day at midnight
SELECT cron.schedule(
  'cleanup-old-sessions',
  '0 0 * * *',  -- Every day at 00:00 UTC
  $$
    DELETE FROM clipboard_sessions WHERE last_accessed < NOW() - INTERVAL '1 day';
    DELETE FROM clipboard_items WHERE sort_id NOT IN (SELECT sort_id FROM clipboard_sessions);
  $$
);