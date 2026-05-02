import express from "express";
import cors from "cors";
import dayjs from "dayjs";
import { loadConfig } from "./config.js";
import { initializeDatabase, interruptActiveSessions } from "./db.js";
import { createDiscordClient } from "./discordClient.js";
import { createVoiceStatsRouter } from "./routes/voiceStats.js";
import { handleVoiceLedgerEvents } from "./voiceEvents.js";

async function main() {
  let config;

  try {
    config = loadConfig();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  initializeDatabase(config.sqliteDbPath);
  const interruptedCount = interruptActiveSessions(dayjs().toISOString());

  if (interruptedCount > 0) {
    console.log(`Closed ${interruptedCount} interrupted voice session(s).`);
  }

  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        const developmentOrigins = new Set([
          ...config.allowedOrigins,
          "http://localhost:5173",
          "http://127.0.0.1:5173",
        ]);

        if (!origin || developmentOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
    }),
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "T&B Voice Presence Ledger API",
    });
  });

  app.get("/api/voice/events", handleVoiceLedgerEvents);
  app.use("/api/voice", createVoiceStatsRouter(config));

  app.use((error, _req, res, _next) => {
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(config.apiPort, () => {
    console.log(`Voice Ledger API listening on http://localhost:${config.apiPort}`);
  });

  const client = createDiscordClient(config);
  await client.login(config.discordBotToken);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
