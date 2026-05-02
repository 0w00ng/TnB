const API_BASE_URL = import.meta.env.VITE_VOICE_LEDGER_API_URL || "";

export function getVoiceLedgerEventUrl() {
  return `${API_BASE_URL}/api/voice/events`;
}

async function request(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Voice Ledger API request failed: ${response.status}`);
  }

  return response.json();
}

export function fetchVoiceSummary() {
  return request("/api/voice/summary");
}

export function fetchVoiceRanking(range = "today") {
  return request(`/api/voice/ranking?range=${encodeURIComponent(range)}`);
}

export function fetchRecentVoiceSessions() {
  return request("/api/voice/sessions/recent");
}

export function fetchActiveVoiceSessions() {
  return request("/api/voice/active");
}

export function fetchChannelStats(range = "week") {
  return request(`/api/voice/channels?range=${encodeURIComponent(range)}`);
}
