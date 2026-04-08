ALTER TABLE t_p42269837_telegram_alternative.messages
  ADD COLUMN IF NOT EXISTS forwarded_from_id integer NULL;
