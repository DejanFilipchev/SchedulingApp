import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3
});

export async function initDb() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS slots (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      duration INTEGER NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      description TEXT,
      booked_name TEXT,
      booked_email TEXT,
      booked_at TIMESTAMPTZ,
      confirmation TEXT,
      UNIQUE (date, start_time)
    )
  `);
}

export default pool;