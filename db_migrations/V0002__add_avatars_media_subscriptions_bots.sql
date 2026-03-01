
ALTER TABLE t_p42269837_telegram_alternative.users ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL;

ALTER TABLE t_p42269837_telegram_alternative.messages ADD COLUMN IF NOT EXISTS msg_type VARCHAR(32) NOT NULL DEFAULT 'text';
ALTER TABLE t_p42269837_telegram_alternative.messages ADD COLUMN IF NOT EXISTS media_url TEXT NULL;
ALTER TABLE t_p42269837_telegram_alternative.messages ADD COLUMN IF NOT EXISTS media_name TEXT NULL;
ALTER TABLE t_p42269837_telegram_alternative.messages ADD COLUMN IF NOT EXISTS media_size INTEGER NULL;
ALTER TABLE t_p42269837_telegram_alternative.messages ADD COLUMN IF NOT EXISTS media_duration INTEGER NULL;
ALTER TABLE t_p42269837_telegram_alternative.messages ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION NULL;
ALTER TABLE t_p42269837_telegram_alternative.messages ADD COLUMN IF NOT EXISTS geo_lon DOUBLE PRECISION NULL;
ALTER TABLE t_p42269837_telegram_alternative.messages ADD COLUMN IF NOT EXISTS contact_name TEXT NULL;
ALTER TABLE t_p42269837_telegram_alternative.messages ADD COLUMN IF NOT EXISTS contact_phone TEXT NULL;
ALTER TABLE t_p42269837_telegram_alternative.messages ADD COLUMN IF NOT EXISTS reply_to_id INTEGER NULL REFERENCES t_p42269837_telegram_alternative.messages(id);

CREATE TABLE IF NOT EXISTS t_p42269837_telegram_alternative.subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p42269837_telegram_alternative.users(id),
  plan VARCHAR(32) NOT NULL DEFAULT 'stellar',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  payment_ref VARCHAR(128) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p42269837_telegram_alternative.bot_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p42269837_telegram_alternative.users(id),
  bot_id VARCHAR(32) NOT NULL DEFAULT 'worchat_bot',
  role VARCHAR(8) NOT NULL DEFAULT 'bot',
  text TEXT NOT NULL,
  extra_data JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
