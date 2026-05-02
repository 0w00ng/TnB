import dayjs from "dayjs";
import { loadConfig } from "../config.js";
import { getDb, initializeDatabase } from "../db.js";
import { memberAliasEntries } from "../memberAliases.js";

const config = loadConfig();
initializeDatabase(config.sqliteDbPath);

const aliases = new Map(memberAliasEntries);
const db = getDb();

const rows = db
  .prepare(
    `
      SELECT user_id, username FROM voice_sessions
      UNION
      SELECT user_id, username FROM active_voice_sessions
    `,
  )
  .all();

const upsertAlias = db.prepare(
  `
    INSERT INTO member_aliases (user_id, display_name, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      display_name = excluded.display_name,
      updated_at = excluded.updated_at
  `,
);

let syncedCount = 0;

for (const row of rows) {
  const alias = aliases.get(row.username);

  if (alias) {
    upsertAlias.run(row.user_id, alias, dayjs().toISOString());
    syncedCount += 1;
  }
}

console.log(`aliases synced: ${syncedCount}`);
