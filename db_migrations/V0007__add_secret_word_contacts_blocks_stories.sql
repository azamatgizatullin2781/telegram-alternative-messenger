-- Add secret_word_hash to users for account recovery
ALTER TABLE t_p42269837_telegram_alternative.users 
ADD COLUMN IF NOT EXISTS secret_word_hash character varying(256) NULL;

-- Create user_contacts table for friend system
CREATE TABLE IF NOT EXISTS t_p42269837_telegram_alternative.user_contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p42269837_telegram_alternative.users(id),
    contact_id INTEGER NOT NULL REFERENCES t_p42269837_telegram_alternative.users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, contact_id)
);

-- Create user_blocks table for blocking users
CREATE TABLE IF NOT EXISTS t_p42269837_telegram_alternative.user_blocks (
    id SERIAL PRIMARY KEY,
    blocker_id INTEGER NOT NULL REFERENCES t_p42269837_telegram_alternative.users(id),
    blocked_id INTEGER NOT NULL REFERENCES t_p42269837_telegram_alternative.users(id),
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- Create stories table
CREATE TABLE IF NOT EXISTS t_p42269837_telegram_alternative.stories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p42269837_telegram_alternative.users(id),
    media_url TEXT NOT NULL,
    media_type VARCHAR(16) DEFAULT 'image',
    text TEXT NULL,
    views INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create story_views table
CREATE TABLE IF NOT EXISTS t_p42269837_telegram_alternative.story_views (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES t_p42269837_telegram_alternative.stories(id),
    viewer_id INTEGER NOT NULL REFERENCES t_p42269837_telegram_alternative.users(id),
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, viewer_id)
);