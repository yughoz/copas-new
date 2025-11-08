-- Create clipboard_items table
CREATE TABLE clipboard_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_id VARCHAR(10) NOT NULL,
  content TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_clipboard_items_sort_id ON clipboard_items(sort_id);
CREATE INDEX idx_clipboard_items_created_at ON clipboard_items(created_at);
CREATE INDEX idx_clipboard_items_sort_id_position ON clipboard_items(sort_id, position);

-- Enable Row Level Security
ALTER TABLE clipboard_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to all items
CREATE POLICY "Allow read access to clipboard items" ON clipboard_items
  FOR SELECT USING (true);

-- Create policy to allow insert for new items
CREATE POLICY "Allow insert of clipboard items" ON clipboard_items
  FOR INSERT WITH CHECK (true);

-- Create policy to allow update of item content and position
CREATE POLICY "Allow update of clipboard items" ON clipboard_items
  FOR UPDATE USING (true);

-- Create policy to allow delete of items
CREATE POLICY "Allow delete of clipboard items" ON clipboard_items
  FOR DELETE USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clipboard_items_updated_at
  BEFORE UPDATE ON clipboard_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();