ALTER TABLE t_p42269837_telegram_alternative.users
  ADD COLUMN IF NOT EXISTS bio text NULL,
  ADD COLUMN IF NOT EXISTS birthdate date NULL;

CREATE TABLE IF NOT EXISTS t_p42269837_telegram_alternative.call_sessions (
  id            serial PRIMARY KEY,
  room_id       varchar(64) NOT NULL UNIQUE,
  caller_id     integer NOT NULL REFERENCES t_p42269837_telegram_alternative.users(id),
  callee_id     integer NOT NULL REFERENCES t_p42269837_telegram_alternative.users(id),
  call_type     varchar(8) NOT NULL DEFAULT 'audio',
  status        varchar(16) NOT NULL DEFAULT 'ringing',
  started_at    timestamptz NULL,
  ended_at      timestamptz NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE t_p42269837_telegram_alternative.chats
  ADD COLUMN IF NOT EXISTS slug varchar(64) NULL;

CREATE TABLE IF NOT EXISTS t_p42269837_telegram_alternative.channel_members (
  channel_id  integer NOT NULL REFERENCES t_p42269837_telegram_alternative.chats(id),
  user_id     integer NOT NULL REFERENCES t_p42269837_telegram_alternative.users(id),
  role        varchar(16) NOT NULL DEFAULT 'subscriber',
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);