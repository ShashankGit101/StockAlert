# StockAlert

A mobile app that lets users track stocks and receive real-time price alerts.

## Architecture

```
StockAlert/
├── mobile/      # React Native (Expo) — iOS & Android app
├── backend/     # Python FastAPI — REST API & WebSocket server
└── cron/        # Python cron job — periodic price checks & alert delivery
```

## Features

- Search and follow stocks by ticker symbol
- Set price threshold alerts (above / below target price)
- Push notifications when alerts trigger
- Historical price charts
- Portfolio watchlist

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| Python | 3.11+ |
| Expo CLI | latest |
| PostgreSQL | 15+ |

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # fill in your values
uvicorn app.main:app --reload
```

### Cron

```bash
cd cron
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python main.py
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

## Environment Variables

See `backend/.env.example` and `cron/.env.example` for required configuration.

## License

MIT
