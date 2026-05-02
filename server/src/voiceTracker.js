import dayjs from "dayjs";
import { getDb } from "./db.js";
import { syncMemberAlias } from "./memberAliases.js";
import { emitVoiceLedgerUpdate } from "./voiceEvents.js";

function getMemberFromState(oldState, newState) {
  return newState.member || oldState.member;
}

function getUsername(member) {
  return member?.displayName || member?.user?.globalName || member?.user?.username || "Unknown";
}

function getChannelName(state) {
  return state.channel?.name || "Unknown Channel";
}

function finishActiveSession({ guildId, userId, leftAt, interrupted = 0 }) {
  const database = getDb();
  const active = database
    .prepare("SELECT * FROM active_voice_sessions WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId);

  if (!active) {
    return null;
  }

  const durationSeconds = Math.max(0, dayjs(leftAt).diff(dayjs(active.joined_at), "second"));

  const transaction = database.transaction(() => {
    database
      .prepare(`
        INSERT INTO voice_sessions (
          guild_id, user_id, username, channel_id, channel_name,
          joined_at, left_at, duration_seconds, interrupted, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        active.guild_id,
        active.user_id,
        active.username,
        active.channel_id,
        active.channel_name,
        active.joined_at,
        leftAt,
        durationSeconds,
        interrupted ? 1 : 0,
        leftAt,
      );

    database
      .prepare("DELETE FROM active_voice_sessions WHERE guild_id = ? AND user_id = ?")
      .run(guildId, userId);
  });

  transaction();
  emitVoiceLedgerUpdate({ action: interrupted ? "interrupted" : "leave", userId, guildId });

  return { ...active, left_at: leftAt, duration_seconds: durationSeconds, interrupted };
}

function startActiveSession({ guildId, userId, username, channelId, channelName, joinedAt }) {
  const database = getDb();

  finishActiveSession({ guildId, userId, leftAt: joinedAt, interrupted: 1 });

  database
    .prepare(`
      INSERT INTO active_voice_sessions (
        guild_id, user_id, username, channel_id, channel_name, joined_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        username = excluded.username,
        channel_id = excluded.channel_id,
        channel_name = excluded.channel_name,
        joined_at = excluded.joined_at
    `)
    .run(guildId, userId, username, channelId, channelName, joinedAt);
  emitVoiceLedgerUpdate({ action: "join", userId, guildId });
}

export function startVoiceSessionFromState(voiceState, joinedAt) {
  const member = voiceState.member;

  if (!member || member.user?.bot || !voiceState.channelId) {
    return false;
  }

  syncMemberAlias(member);

  startActiveSession({
    guildId: voiceState.guild.id,
    userId: member.user.id,
    username: getUsername(member),
    channelId: voiceState.channelId,
    channelName: getChannelName(voiceState),
    joinedAt,
  });

  return true;
}

export function handleVoiceStateUpdate(oldState, newState) {
  const member = getMemberFromState(oldState, newState);

  if (!member || member.user?.bot) {
    return;
  }

  if (oldState.channelId === newState.channelId) {
    return;
  }

  const guildId = newState.guild?.id || oldState.guild?.id;
  const userId = member.user.id;
  const username = getUsername(member);
  const nowIso = dayjs().toISOString();

  syncMemberAlias(member);

  if (!oldState.channelId && newState.channelId) {
    startActiveSession({
      guildId,
      userId,
      username,
      channelId: newState.channelId,
      channelName: getChannelName(newState),
      joinedAt: nowIso,
    });
    return;
  }

  if (oldState.channelId && !newState.channelId) {
    finishActiveSession({ guildId, userId, leftAt: nowIso });
    return;
  }

  if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    finishActiveSession({ guildId, userId, leftAt: nowIso });
    startActiveSession({
      guildId,
      userId,
      username,
      channelId: newState.channelId,
      channelName: getChannelName(newState),
      joinedAt: nowIso,
    });
  }
}
