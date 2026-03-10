-- Contact Intelligence v1 Schema
-- Run this in your Supabase SQL Editor or via CLI migration

-- Contacts table: one row per contact per user
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  relationship_type TEXT,
  group_name TEXT,
  subgroup_name TEXT,
  strength INTEGER CHECK (strength >= 1 AND strength <= 10),
  sentiment TEXT,
  classification JSONB,
  interaction JSONB,
  graph_position JSONB,
  source TEXT DEFAULT 'gmail-scan',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_relationship ON contacts(user_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_contacts_group ON contacts(user_id, group_name);
CREATE INDEX IF NOT EXISTS idx_contacts_strength ON contacts(user_id, strength DESC);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contacts_select ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY contacts_insert ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY contacts_update ON contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY contacts_delete ON contacts FOR DELETE USING (auth.uid() = user_id);

-- Contact groups: stores the knowledge graph structure
CREATE TABLE IF NOT EXISTS contact_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  parent_id UUID REFERENCES contact_groups(id) ON DELETE SET NULL,
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_groups_user_id ON contact_groups(user_id);

ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY groups_select ON contact_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY groups_insert ON contact_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY groups_update ON contact_groups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY groups_delete ON contact_groups FOR DELETE USING (auth.uid() = user_id);

-- Scan metadata: track scan state per user
CREATE TABLE IF NOT EXISTS scan_metadata (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_scan_at TIMESTAMPTZ,
  contacts_found INTEGER DEFAULT 0,
  emails_processed INTEGER DEFAULT 0,
  scan_status TEXT DEFAULT 'idle',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scan_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY scan_select ON scan_metadata FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY scan_insert ON scan_metadata FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY scan_update ON scan_metadata FOR UPDATE USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER scan_metadata_updated_at
  BEFORE UPDATE ON scan_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
