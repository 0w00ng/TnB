# T&B Voice Presence Ledger Server

Discord 음성채널 입장, 퇴장, 이동 이벤트를 기록하고 `/systems/voice-ledger` 페이지에 통계를 제공하는 서버입니다.

봇은 음성채널에 직접 접속하지 않습니다. 실행 중인 봇 프로세스가 `GuildVoiceStates` 이벤트만 수신합니다.

## Local Development

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

`.env` 예시:

```env
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=1322448107572690954
PORT=4000
ALLOWED_ORIGINS=http://localhost:5173
SQLITE_DB_PATH=./voice-ledger.sqlite
```

## Railway Deploy

1. Railway에서 GitHub repo를 연결합니다.
2. Service root directory를 `server`로 설정합니다.
3. Variables에 아래 값을 추가합니다.

```env
DISCORD_BOT_TOKEN=새로 발급받은 봇 토큰
DISCORD_GUILD_ID=1322448107572690954
ALLOWED_ORIGINS=https://frontend-domain.example
SQLITE_DB_PATH=/data/voice-ledger.sqlite
```

Railway가 `PORT`를 자동으로 주입하므로 직접 설정하지 않아도 됩니다.

4. Railway service에 Volume을 추가합니다.
5. Volume mount path를 `/data`로 설정합니다.
6. 배포 후 `https://your-service.up.railway.app/api/health`가 정상 응답하는지 확인합니다.

## Discord Developer Portal

- Message Content Intent 필요 없음
- Presence Intent 필요 없음
- Server Members Intent 필요 없음
- 코드에서는 `Guilds`, `GuildVoiceStates` intent만 사용합니다.
- 토큰은 코드, README, 프론트엔드, GitHub에 절대 넣지 않습니다.

## Notes

- 봇이 꺼져 있는 동안 발생한 입장, 퇴장, 이동 이벤트는 기록할 수 없습니다.
- 서버 재시작으로 끊긴 active session은 `interrupted = 1`로 저장합니다.
- 60초 미만 세션은 통계에서 제외합니다.
- SQLite를 Railway에서 유지하려면 `/data` Volume이 필요합니다.

## API

- `GET /api/health`
- `GET /api/voice/summary`
- `GET /api/voice/ranking?range=today`
- `GET /api/voice/sessions/recent`
- `GET /api/voice/active`
- `GET /api/voice/channels?range=week`
- `GET /api/voice/events`
