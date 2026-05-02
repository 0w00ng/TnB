const clients = new Set();

export function emitVoiceLedgerUpdate(payload = {}) {
  const message = `event: voice-ledger-update\ndata: ${JSON.stringify({
    type: "voice-ledger-update",
    updatedAt: new Date().toISOString(),
    ...payload,
  })}\n\n`;

  for (const client of clients) {
    client.write(message);
  }
}

export function handleVoiceLedgerEvents(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  res.write("event: connected\ndata: {\"ok\":true}\n\n");

  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
  });
}
