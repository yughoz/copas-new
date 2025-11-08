-- Create clipboard_sessions table
CREATE TABLE clipboard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_id VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  item_count INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX idx_clipboard_sessions_sort_id ON clipboard_sessions(sort_id);
CREATE INDEX idx_clipboard_sessions_created_at ON clipboard_sessions(created_at);

-- Enable Row Level Security
ALTER TABLE clipboard_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to all sessions
CREATE POLICY "Allow read access to clipboard sessions" ON clipboard_sessions
  FOR SELECT USING (true);

-- Create policy to allow insert for new sessions
CREATE POLICY "Allow insert of clipboard sessions" ON clipboard_sessions
  FOR INSERT WITH CHECK (true);

-- Create policy to allow update of session timestamps and item count
CREATE POLICY "Allow update of clipboard sessions" ON clipboard_sessions
  FOR UPDATE USING (true);

-- Create policy to allow delete of sessions
CREATE POLICY "Allow delete of clipboard sessions" ON clipboard_sessions
  FOR DELETE USING (true);