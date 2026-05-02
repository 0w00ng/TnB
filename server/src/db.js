import Database from "better-sqlite3";
import dayjs from "dayjs";
import fs from "node:fs";
import path from "node:path";

let db;

export function initializeDatabase(dbPath) {
  const directory = path.dirname(path.resolve(dbPath));

  if (directory && directory !== ".") {
    fs.mkdirSync(directory, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS active_voice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      UNIQUE(guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS voice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      left_at TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      interrupted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS member_aliases (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_voice_sessions_guild_id ON voice_sessions(guild_id);
    CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON voice_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_voice_sessions_joined_at ON voice_sessions(joined_at);
    CREATE INDEX IF NOT EXISTS idx_voice_sessions_channel_id ON voice_sessions(channel_id);
  `);

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error("Database is not initialized.");
  }

  return db;
}

export function interruptActiveSessions(nowIso = dayjs().toISOString()) {
  const database = getDb();
  const sessions = database.prepare("SELECT * FROM active_voice_sessions").all();

  const insert = database.prepare(`
    INSERT INTO voice_sessions (
      guild_id, user_id, username, channel_id, channel_name,
      joined_at, left_at, duration_seconds, interrupted, created_at
    )
    VALUES (
      @guild_id, @user_id, @username, @channel_id, @channel_name,
      @joined_at, @left_at, @duration_seconds, 1, @created_at
    )
  `);

  const clear = database.prepare("DELETE FROM active_voice_sessions");
  const transaction = database.transaction(() => {
    for (const session of sessions) {
      const durationSeconds = Math.max(
        0,
        dayjs(nowIso).diff(dayjs(session.joined_at), "second"),
      );

      insert.run({
        ...session,
        left_at: nowIso,
        duration_seconds: durationSeconds,
        created_at: nowIso,
      });
    }

    clear.run();
  });

  transaction();
  return sessions.length;
}
