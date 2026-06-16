# MrProfit — Crypto Trading Bot

Freqtrade-based crypto trading bot for Bybit (BTC/USDT, ETH/USDT).  
Paper trading enabled by default — no real funds at risk.

## Strategies

| Strategy | Logic | Timeframe |
|---|---|---|
| `RSIStrategy` | Buy RSI < 30, Sell RSI > 70 | 1h |
| `MACrossStrategy` | EMA 20/100 golden cross | 1h |
| `BBStrategy` | Bollinger Bands + RSI double confirmation | 1h |

## Setup

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 2. Clone & run

```bash
git clone https://github.com/mzterwalexzyy/MrProfit.git
cd MrProfit
docker compose up -d
```

### 3. Telegram Notifications (recommended for mobile)

1. Message **@BotFather** on Telegram → `/newbot` → copy your token
2. Message **@userinfobot** → copy your Chat ID
3. Edit `user_data/config.json`:

```json
"telegram": {
    "enabled": true,
    "token": "YOUR_BOT_TOKEN",
    "chat_id": "YOUR_CHAT_ID"
}
```

4. Restart: `docker compose restart`

### 4. Switch strategy

Edit the last line of `docker-compose.yml`:

```yaml
--strategy MACrossStrategy   # or BBStrategy
```

Then restart: `docker compose restart`

## Telegram Commands

| Command | What it does |
|---|---|
| `/status` | Show open trades |
| `/balance` | Show wallet balance |
| `/profit` | Show profit summary |
| `/start` | Start trading |
| `/stop` | Stop trading |
| `/forcesell all` | Close all open trades |

## Paper Trading Config

- **Wallet:** 1000 USDT (simulated)
- **Stake per trade:** 100 USDT
- **Max open trades:** 3
- **Exchange:** Bybit (no API keys needed for paper trading)

## Go Live

1. Create Bybit API keys (Trade permission only, no withdrawal)
2. Add to `user_data/config.json`:
   ```json
   "key": "your-api-key",
   "secret": "your-api-secret"
   ```
3. Set `"dry_run": false`
4. Change `jwt_secret_key`, `ws_token`, and `password` to secure values
5. Restart: `docker compose restart`
