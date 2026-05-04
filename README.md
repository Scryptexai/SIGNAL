# SIGNAL Agent

Autonomous X (Twitter) content agent untuk topik **Eskatologi Digital × Teknologi Kuno × Pola Peradaban**.

---

## Quick Start (5 Langkah)

```bash
# 1. Install dependencies
npm install

# 2. Copy dan isi environment variables
cp .env.example .env

# 3. Edit .env — isi API keys (lihat bagian Environment Setup di bawah)
nano .env

# 4. Build TypeScript
npm run build

# 5. Jalankan dry-run pertama (tidak posting ke X)
npm run dry-run
```

---

## Environment Setup

Edit `.env` dengan nilai berikut:

| Variable | Keterangan |
|---|---|
| `ANTHROPIC_API_KEY` | API key dari console.anthropic.com |
| `X_API_KEY` | Consumer Key dari X Developer Portal |
| `X_API_SECRET` | Consumer Secret |
| `X_ACCESS_TOKEN` | Access Token (buat di Developer Portal) |
| `X_ACCESS_TOKEN_SECRET` | Access Token Secret |
| `X_BEARER_TOKEN` | Bearer Token (untuk read-only ops) |
| `POSTING_ENABLED` | Set `true` untuk go live |
| `POST_MODE` | `dry-run` / `scheduled` / `manual` |

---

## Cara Dapat X API Credentials

1. Buka [developer.twitter.com](https://developer.twitter.com)
2. Buat project baru → pilih "Free" tier
3. Di App Settings → **Keys and Tokens**
4. Generate: Consumer Keys + Access Token & Secret
5. Pastikan app permission: **Read and Write**
6. Copy semua ke `.env`

> ⚠️ Free tier limit: 17 tweets per 24 jam. Agent sudah handle ini otomatis.

---

## Dry-Run Pertama

```bash
npm run dry-run
```

Output yang diharapkan:
```
[HH:mm:ss] info: SIGNAL Agent starting...
[HH:mm:ss] info: Mode: dry-run | Posting: false
[HH:mm:ss] info: Generating content for topic: baalbek-trilithon
[HH:mm:ss] info: Content generated: thread, 5 tweets, score: 8
[HH:mm:ss] info:   [1] Batu seberat 1200 ton...
...
```

---

## Deployment ke Railway

1. Push repo ke GitHub
2. Buka [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Pilih repo ini
4. Di tab **Variables**, tambahkan semua env vars dari `.env`
5. Railway auto-detect `railway.toml` dan deploy

Atau via CLI:
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## Cara Tambah Topik Baru

Edit `src/data/topics.json`, tambahkan entry baru:

```json
{
  "id": "topik-baru-unik",
  "title": "Judul Topik",
  "angle": "Sudut pandang yang menarik",
  "source_theme": "eskatologi",
  "format": "thread",
  "priority": 1,
  "posted": false,
  "last_posted": null,
  "tags": ["tag1", "tag2"]
}
```

Restart agent setelah edit.

---

## Dashboard

Akses di `http://localhost:3000` saat agent berjalan dengan `DASHBOARD_ENABLED=true`.

Fitur:
- **Status** — monitoring real-time, rate limit, next post time
- **Queue** — approve/reject konten sebelum dipost
- **Generator** — generate konten on-demand
- **Log** — history semua post
- **Topics** — lihat semua topik dan prioritas

---

## Troubleshooting

**`Error: Claude returned invalid JSON`**
→ Coba lagi. Kadang Claude menambahkan teks di luar JSON. Sudah ada retry logic.

**`Rate limit reached`**
→ Tunggu reset 24 jam, atau kurangi `MAX_POSTS_PER_DAY` di `.env`.

**`TwitterApiError: 403`**
→ Pastikan app permission di X Developer Portal adalah **Read and Write**, bukan Read-only.

**`Cannot find module`**
→ Jalankan `npm run build` dulu sebelum `npm start`.

**Konten tidak dipost meski sudah approve**
→ Cek `POSTING_ENABLED=true` di `.env`. Default-nya `false` untuk keamanan.

---

## Mode Operasi

| Mode | Perilaku |
|---|---|
| `dry-run` | Generate konten, log ke console, tidak post |
| `manual` | Generate → masuk queue → approve via dashboard |
| `scheduled` | Cron otomatis: 06:00, 12:00, 20:00 WIB |

---

*SIGNAL Agent v1.0 — Built for autonomous content publishing*
