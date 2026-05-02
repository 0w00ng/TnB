# T&B Deployment Checklist

## 1. Backend: Railway

Railway service root directory:

```text
server
```

Install command:

```bash
npm install
```

Start command:

```bash
npm start
```

Required variables:

```env
DISCORD_BOT_TOKEN=새로 발급받은 Discord Bot Token
DISCORD_GUILD_ID=1322448107572690954
ALLOWED_ORIGINS=https://frontend-domain.example
SQLITE_DB_PATH=/data/voice-ledger.sqlite
```

Railway는 `PORT`를 자동으로 주입하므로 별도 설정하지 않아도 됩니다.

Volume:

```text
Mount path: /data
```

Health check:

```text
https://railway-service-url/api/health
```

## 2. Frontend

Frontend env:

```env
VITE_VOICE_LEDGER_API_URL=https://railway-service-url
```

## 3. Security

Never commit:

- `server/.env`
- Discord Bot Token
- SQLite database files
- local logs
- raw KakaoTalk logs
