import dotenv from "dotenv";

dotenv.config({ quiet: true });

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is required. Create server/.env from server/.env.example and fill it in.`,
    );
  }

  return value;
}

export function loadConfig() {
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ||
    process.env.ALLOWED_ORIGIN ||
    "http://localhost:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    discordBotToken: requireEnv("DISCORD_BOT_TOKEN"),
    discordGuildId: requireEnv("DISCORD_GUILD_ID"),
    apiPort: Number(process.env.PORT || process.env.API_PORT || 4000),
    allowedOrigins,
    sqliteDbPath: process.env.SQLITE_DB_PATH || "./voice-ledger.sqlite",
    timezone: "Asia/Seoul",
    minStatDurationSeconds: 60,
  };
}
