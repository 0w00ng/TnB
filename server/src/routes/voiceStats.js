import express from "express";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { getDb } from "../db.js";
import { formatDuration } from "../utils/formatDuration.js";

dayjs.extend(utc);
dayjs.extend(timezone);

function getRangeStart(range, timezoneName) {
  const now = dayjs().tz(timezoneName);

  if (range === "today") {
    return now.startOf("day").toISOString();
  }

  if (range === "week") {
    return now.subtract(7, "day").toISOString();
  }

  if (range === "month") {
    return now.subtract(30, "day").toISOString();
  }

  return null;
}

function createWhere({ guildId, range, timezoneName, minDurationSeconds, tableAlias = "" }) {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  const clauses = [
    `${prefix}guild_id = ?`,
    `${prefix}duration_seconds >= ?`,
    `${prefix}interrupted = 0`,
  ];
  const params = [guildId, minDurationSeconds];
  const rangeStart = getRangeStart(range, timezoneName);

  if (rangeStart) {
    clauses.push(`${prefix}joined_at >= ?`);
    params.push(rangeStart);
  }

  return { sql: clauses.join(" AND "), params };
}

function getDisplayName(row) {
  return row.display_name || row.username;
}

function getActiveDurationSeconds(row, rangeStart, now) {
  const joinedAt = dayjs(row.joined_at);
  const effectiveStart = rangeStart && joinedAt.isBefore(rangeStart) ? rangeStart : joinedAt;

  return Math.max(0, now.diff(effectiveStart, "second"));
}

function getActiveRows(db, guildId) {
  return db
    .prepare(`
      SELECT avs.*, ma.display_name
      FROM active_voice_sessions avs
      LEFT JOIN member_aliases ma ON ma.user_id = avs.user_id
      WHERE avs.guild_id = ?
    `)
    .all(guildId);
}

function getActiveRowsWithDuration(db, { guildId, range, timezoneName }) {
  const now = dayjs();
  const rangeStartIso = getRangeStart(range, timezoneName);
  const rangeStart = rangeStartIso ? dayjs(rangeStartIso) : null;

  return getActiveRows(db, guildId)
    .map((row) => ({
      ...row,
      currentDurationSeconds: getActiveDurationSeconds(row, rangeStart, now),
    }))
    .filter((row) => row.currentDurationSeconds >= 60);
}

function upsertMapValue(map, key, initialValue) {
  if (!map.has(key)) {
    map.set(key, initialValue);
  }

  return map.get(key);
}

export function createVoiceStatsRouter(config) {
  const router = express.Router();

  router.get("/summary", (_req, res) => {
    const db = getDb();
    const todayWhere = createWhere({ guildId: config.discordGuildId, range: "today", timezoneName: config.timezone, minDurationSeconds: config.minStatDurationSeconds });
    const weekWhere = createWhere({ guildId: config.discordGuildId, range: "week", timezoneName: config.timezone, minDurationSeconds: config.minStatDurationSeconds });

    const todayCompletedTotal = db.prepare(`SELECT COALESCE(SUM(duration_seconds), 0) AS total FROM voice_sessions WHERE ${todayWhere.sql}`).get(...todayWhere.params).total || 0;
    const weekCompletedTotal = db.prepare(`SELECT COALESCE(SUM(duration_seconds), 0) AS total FROM voice_sessions WHERE ${weekWhere.sql}`).get(...weekWhere.params).total || 0;

    const activeTodayRows = getActiveRowsWithDuration(db, { guildId: config.discordGuildId, range: "today", timezoneName: config.timezone });
    const activeWeekRows = getActiveRowsWithDuration(db, { guildId: config.discordGuildId, range: "week", timezoneName: config.timezone });

    const todayTotal = todayCompletedTotal + activeTodayRows.reduce((sum, row) => sum + row.currentDurationSeconds, 0);
    const weekTotal = weekCompletedTotal + activeWeekRows.reduce((sum, row) => sum + row.currentDurationSeconds, 0);

    const completedMembers = db.prepare(`
      SELECT vs.user_id, vs.username, ma.display_name, SUM(vs.duration_seconds) AS total
      FROM voice_sessions vs
      LEFT JOIN member_aliases ma ON ma.user_id = vs.user_id
      WHERE ${weekWhere.sql}
      GROUP BY vs.user_id
    `).all(...weekWhere.params);

    const memberTotals = new Map();
    for (const row of completedMembers) {
      memberTotals.set(row.user_id, { username: row.username, display_name: row.display_name, total: row.total || 0 });
    }

    for (const row of activeWeekRows) {
      const member = upsertMapValue(memberTotals, row.user_id, { username: row.username, display_name: row.display_name, total: 0 });
      member.username = row.username;
      member.display_name = row.display_name;
      member.total += row.currentDurationSeconds;
    }

    const mostActive = [...memberTotals.values()].sort((a, b) => b.total - a.total)[0];

    const completedChannels = db.prepare(`
      SELECT channel_id, channel_name, SUM(duration_seconds) AS total
      FROM voice_sessions
      WHERE ${weekWhere.sql}
      GROUP BY channel_id
    `).all(...weekWhere.params);

    const channelTotals = new Map();
    for (const row of completedChannels) {
      channelTotals.set(row.channel_id, { channel_name: row.channel_name, total: row.total || 0 });
    }

    for (const row of activeWeekRows) {
      const channel = upsertMapValue(channelTotals, row.channel_id, { channel_name: row.channel_name, total: 0 });
      channel.channel_name = row.channel_name;
      channel.total += row.currentDurationSeconds;
    }

    const mostChannel = [...channelTotals.values()].sort((a, b) => b.total - a.total)[0];
    const activeSessionCount = db.prepare("SELECT COUNT(*) AS count FROM active_voice_sessions WHERE guild_id = ?").get(config.discordGuildId).count || 0;

    res.json({
      todayTotalSeconds: todayTotal,
      todayTotalLabel: formatDuration(todayTotal),
      weekTotalSeconds: weekTotal,
      weekTotalLabel: formatDuration(weekTotal),
      mostActiveMember: mostActive ? getDisplayName(mostActive) : "기록 없음",
      mostOccupiedChannel: mostChannel?.channel_name || "기록 없음",
      activeSessionCount,
      lastUpdatedAt: dayjs().tz(config.timezone).format(),
    });
  });

  router.get("/ranking", (req, res) => {
    const range = ["today", "week", "month", "total"].includes(req.query.range) ? req.query.range : "today";
    const db = getDb();
    const where = createWhere({ guildId: config.discordGuildId, range, timezoneName: config.timezone, minDurationSeconds: config.minStatDurationSeconds, tableAlias: "vs" });

    const completedRows = db.prepare(`
      SELECT vs.user_id AS userId, vs.username, ma.display_name, SUM(vs.duration_seconds) AS totalSeconds, COUNT(*) AS sessionCount, avs.user_id AS activeUserId
      FROM voice_sessions vs
      LEFT JOIN member_aliases ma ON ma.user_id = vs.user_id
      LEFT JOIN active_voice_sessions avs ON avs.guild_id = vs.guild_id AND avs.user_id = vs.user_id
      WHERE ${where.sql}
      GROUP BY vs.user_id
    `).all(...where.params);

    const completedChannelRows = db.prepare(`
      SELECT vs.user_id AS userId, vs.channel_name AS channelName, SUM(vs.duration_seconds) AS totalSeconds
      FROM voice_sessions vs
      WHERE ${where.sql}
      GROUP BY vs.user_id, vs.channel_id
    `).all(...where.params);

    const rankingByUser = new Map();
    for (const row of completedRows) {
      rankingByUser.set(row.userId, { userId: row.userId, username: row.username, display_name: row.display_name, totalSeconds: row.totalSeconds || 0, sessionCount: row.sessionCount || 0, activeUserId: row.activeUserId, channelTotals: new Map() });
    }

    for (const row of completedChannelRows) {
      const target = rankingByUser.get(row.userId);
      if (target) target.channelTotals.set(row.channelName, row.totalSeconds || 0);
    }

    const activeRows = getActiveRowsWithDuration(db, { guildId: config.discordGuildId, range, timezoneName: config.timezone });
    for (const row of activeRows) {
      const current = upsertMapValue(rankingByUser, row.user_id, { userId: row.user_id, username: row.username, display_name: row.display_name, totalSeconds: 0, sessionCount: 0, activeUserId: row.user_id, channelTotals: new Map() });
      current.username = row.username;
      current.display_name = row.display_name;
      current.totalSeconds += row.currentDurationSeconds;
      current.sessionCount += 1;
      current.activeUserId = row.user_id;
      current.channelTotals.set(row.channel_name, (current.channelTotals.get(row.channel_name) || 0) + row.currentDurationSeconds);
    }

    const rows = [...rankingByUser.values()].map((row) => {
      const [mainChannel] = [...row.channelTotals.entries()].sort((a, b) => b[1] - a[1])[0] || [];
      return { ...row, mainChannel: mainChannel || "기록 없음" };
    }).sort((a, b) => b.totalSeconds - a.totalSeconds).slice(0, 50);

    res.json(rows.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      username: row.username,
      displayName: getDisplayName(row),
      totalSeconds: row.totalSeconds,
      totalTimeLabel: formatDuration(row.totalSeconds),
      sessionCount: row.sessionCount,
      mainChannel: row.mainChannel,
      status: row.activeUserId ? "활동 중" : "기록됨",
    })));
  });

  router.get("/sessions/recent", (_req, res) => {
    const db = getDb();
    const rows = db.prepare(`
      SELECT vs.*, ma.display_name
      FROM voice_sessions vs
      LEFT JOIN member_aliases ma ON ma.user_id = vs.user_id
      WHERE vs.guild_id = ?
      ORDER BY vs.left_at DESC
      LIMIT 20
    `).all(config.discordGuildId);

    res.json(rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: getDisplayName(row),
      channelName: row.channel_name,
      joinedAt: row.joined_at,
      leftAt: row.left_at,
      durationSeconds: row.duration_seconds,
      durationLabel: formatDuration(row.duration_seconds),
      interrupted: Boolean(row.interrupted),
    })));
  });

  router.get("/active", (_req, res) => {
    const db = getDb();
    const now = dayjs();
    const rows = db.prepare(`
      SELECT avs.*, ma.display_name
      FROM active_voice_sessions avs
      LEFT JOIN member_aliases ma ON ma.user_id = avs.user_id
      WHERE avs.guild_id = ?
      ORDER BY avs.joined_at ASC
    `).all(config.discordGuildId);

    res.json(rows.map((row) => {
      const currentDurationSeconds = Math.max(0, now.diff(dayjs(row.joined_at), "second"));
      return {
        username: row.username,
        displayName: getDisplayName(row),
        channelName: row.channel_name,
        joinedAt: row.joined_at,
        currentDurationSeconds,
        currentDurationLabel: formatDuration(currentDurationSeconds),
      };
    }));
  });

  router.get("/channels", (req, res) => {
    const range = ["today", "week", "month", "total"].includes(req.query.range) ? req.query.range : "week";
    const db = getDb();
    const where = createWhere({ guildId: config.discordGuildId, range, timezoneName: config.timezone, minDurationSeconds: config.minStatDurationSeconds });

    const completedRows = db.prepare(`
      SELECT channel_id AS channelId, channel_name AS channelName, SUM(duration_seconds) AS totalSeconds, COUNT(*) AS sessionCount
      FROM voice_sessions
      WHERE ${where.sql}
      GROUP BY channel_id
    `).all(...where.params);

    const channelMap = new Map();
    for (const row of completedRows) {
      channelMap.set(row.channelId, { channelName: row.channelName, totalSeconds: row.totalSeconds || 0, sessionCount: row.sessionCount || 0 });
    }

    const activeRows = getActiveRowsWithDuration(db, { guildId: config.discordGuildId, range, timezoneName: config.timezone });
    for (const row of activeRows) {
      const channel = upsertMapValue(channelMap, row.channel_id, { channelName: row.channel_name, totalSeconds: 0, sessionCount: 0 });
      channel.channelName = row.channel_name;
      channel.totalSeconds += row.currentDurationSeconds;
      channel.sessionCount += 1;
    }

    const rows = [...channelMap.values()].sort((a, b) => b.totalSeconds - a.totalSeconds).slice(0, 20);
    res.json(rows.map((row) => ({ channelName: row.channelName, totalSeconds: row.totalSeconds, totalTimeLabel: formatDuration(row.totalSeconds), sessionCount: row.sessionCount })));
  });

  return router;
}
