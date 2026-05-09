import { query } from './db';

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS apps (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      config JSONB NOT NULL,
      owner_id INT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    ALTER TABLE apps
      ADD COLUMN IF NOT EXISTS owner_id INT REFERENCES users(id) ON DELETE SET NULL;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS dynamic_records (
      id SERIAL PRIMARY KEY,
      app_id VARCHAR(255) REFERENCES apps(id) ON DELETE CASCADE,
      model_name VARCHAR(255) NOT NULL,
      owner_id INT REFERENCES users(id) ON DELETE SET NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_dynamic_records_lookup ON dynamic_records (app_id, model_name);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      app_id VARCHAR(255) REFERENCES apps(id) ON DELETE CASCADE,
      user_id INT REFERENCES users(id) ON DELETE SET NULL,
      event VARCHAR(80) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      read_at TIMESTAMP NULL,
      mock_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_lookup ON notifications (app_id, user_id, created_at);
  `);
}

let dbReadyPromise: Promise<void> | null = null;

export function ensureDbReady() {
  if (!dbReadyPromise) {
    dbReadyPromise = initDb();
  }

  return dbReadyPromise;
}
