import { Client, GatewayIntentBits } from "discord.js";
import dayjs from "dayjs";
import { handleVoiceStateUpdate, startVoiceSessionFromState } from "./voiceTracker.js";

async function bootstrapActiveVoiceSessions(client, config) {
  const guild = await client.guilds.fetch(config.discordGuildId);
  const joinedAt = dayjs().toISOString();
  let bootstrappedCount = 0;

  for (const voiceState of guild.voiceStates.cache.values()) {
    if (startVoiceSessionFromState(voiceState, joinedAt)) {
      bootstrappedCount += 1;
    }
  }

  if (bootstrappedCount > 0) {
    console.log(`Bootstrapped ${bootstrappedCount} active voice session(s) from bot start time.`);
  }
}

export function createDiscordClient(config) {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  });

  client.once("ready", async (readyClient) => {
    console.log(`Discord bot logged in as ${readyClient.user.tag}`);

    try {
      await bootstrapActiveVoiceSessions(readyClient, config);
    } catch (error) {
      console.error(`Failed to bootstrap active voice sessions: ${error.message}`);
    }
  });

  client.on("voiceStateUpdate", (oldState, newState) => {
    const guildId = newState.guild?.id || oldState.guild?.id;

    if (guildId !== config.discordGuildId) {
      return;
    }

    handleVoiceStateUpdate(oldState, newState);
  });

  return client;
}
