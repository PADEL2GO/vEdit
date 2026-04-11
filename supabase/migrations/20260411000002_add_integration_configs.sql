-- Integration configs table: stores API keys and settings for external services.
-- No RLS policies are added intentionally — the table is only accessible via
-- service-role key (used by edge functions). The admin API edge function
-- enforces its own authentication before reading/writing here.
CREATE TABLE IF NOT EXISTS site_integration_configs (
  service   text        PRIMARY KEY,  -- 'stripe' | 'resend' | 'app' | 'paypal'
  config    jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid        REFERENCES auth.users(id)
);

ALTER TABLE site_integration_configs ENABLE ROW LEVEL SECURITY;

-- Seed empty rows so upserts always find an existing record
INSERT INTO site_integration_configs (service) VALUES
  ('stripe'),
  ('resend'),
  ('app'),
  ('paypal')
ON CONFLICT (service) DO NOTHING;
