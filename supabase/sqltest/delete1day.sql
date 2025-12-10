-- Delete sessions older than 1 day (based on last_accessed)
DELETE FROM clipboard_sessions 
WHERE last_accessed < NOW() - INTERVAL '1 day';
-- Also delete orphaned clipboard_items
DELETE FROM clipboard_items 
WHERE sort_id NOT IN (SELECT sort_id FROM clipboard_sessions);