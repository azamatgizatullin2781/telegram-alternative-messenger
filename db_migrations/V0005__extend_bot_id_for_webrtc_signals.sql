-- Расширяем bot_id для хранения WebRTC сигналов (call_{room_id} = 37 символов)
ALTER TABLE t_p42269837_telegram_alternative.bot_messages
    ALTER COLUMN bot_id TYPE character varying(64);
