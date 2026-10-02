# STRIDE — Production Fitness & GPS Tracking Platform ⚡

STRIDE is a high-performance, Gen-Z oriented fitness tracking application built from scratch with an original visual identity, provider-independent map architecture, real-time GPS telemetry engine, gamification system, and modular REST API backend.

---

## 🎨 Visual Identity & Design System

- **Primary Accent**: Electric Volt Yellow (`#E2F952` / `#FFE500`)
- **Dark Mode**: Obsidian Carbon (`#09090C`, `#121217`, `#181820`)
- **Light Mode**: Clean Frost White (`#F3F4F8`, `#FFFFFF`, `#E6E8F0`)
- **Aesthetic**: Sporty, Minimal, High-end, Futuristic, Tactical Telemetry
- **Typography**: Space Grotesk (headers), Inter (body), JetBrains Mono (metrics & timers)

---

## 🏗️ Architecture

```
STRIDE/
├── backend/                  # Node.js + TypeScript + Express + Prisma ORM
│   ├── prisma/schema.prisma  # Complete relational schema (SQLite default / PostgreSQL ready)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/         # JWT registration, bcrypt login, session verification
│   │   │   ├── activities/   # Activity recording, GPS points, splits calculation, batch sync
│   │   │   ├── users/        # Athlete profiles, analytics, personal records, GDPR deletion
│   │   │   ├── gamification/ # XP calculation, level progression, achievements, challenges
│   │   │   ├── privacy/      # Start/End masking, custom privacy zones (Home/Work)
│   │   │   ├── safety/       # Emergency contacts, temporary live location share links
│   │   │   ├── notifications/# Category alerts (achievements, streaks, safety)
│   │   │   └── routes/       # Community circuits, route discovery
│   │   ├── utils/geo.ts      # Haversine distance, split paces, elevation, privacy masking
│   │   ├── server.ts         # Express server mounting modular REST API
│   │   ├── seed.ts           # Initial achievements, active challenges, demo athlete
│   │   └── tests/            # Automated test suite (14/14 tests passing)
│   └── .env.example
│
└── mobile/                   # Vite + React + TypeScript + Leaflet PWA
    ├── src/
    │   ├── components/
    │   │   ├── Header/       # Slanted geometric STRIDE mark, safety hub, theme toggle
    │   │   ├── Navigation/   # 5-tab bar with raised glowing yellow record button
    │   │   └── Map/          # Provider-independent Leaflet map (Dark Matter & Positron tiles)
    │   ├── hooks/
    │   │   └── useTracker.ts # Geolocation watchPosition + Indoor/Desktop simulator engine
    │   ├── screens/
    │   │   ├── HomeScreen.tsx        # Streak flame, weekly progress ring, recent activities
    │   │   ├── ExploreScreen.tsx     # Route discovery & community trails
    │   │   ├── RecordScreen.tsx      # Live GPS HUD, pause/resume, confetti completion flow
    │   │   ├── ProgressScreen.tsx    # Analytics charts, personal records, achievements, leaderboards
    │   │   ├── ProfileScreen.tsx     # Level progression, privacy masking, safety live share
    │   │   ├── ActivityDetailModal.tsx # Interactive route map, splits bars, elevation
    │   │   └── AuthModal.tsx         # Sign in / Register with 1-click Demo Account fill
    │   ├── services/api.ts   # Typed API client + offline localStorage sync queue
    │   ├── App.tsx
    │   └── index.css         # Complete STRIDE Design System tokens
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)

### 1. Run Backend Server
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npx tsx src/seed.ts     # Populates demo athlete, achievements, and challenges
npm run dev             # Starts API at http://localhost:4000
```

### 2. Run Mobile Client
```bash
cd mobile
npm install
npm run dev             # Starts Mobile Vite app at http://localhost:5173
```

Demo Athlete Credentials:
- **Email / Username**: Athlete account credentials
- **Password**: `stride2025`
*(Or click "Instant Demo Account" on the login modal)*

---

## 🧪 Automated Tests

Run backend tests verifying GPS math, splits, privacy masking, and auth:
```bash
npm --prefix backend test
```
Result: `14 PASSED, 0 FAILED`

---

## 🔒 Privacy & Safety Features
1. **Start & Finish Masking**: Automatically strips GPS coordinates within 200m–1000m of activity endpoints to protect home or workplace privacy.
2. **Custom Privacy Zones**: Define geographical exclusion circles (Home, University, Office).
3. **Live Safety Hub**: Generate temporary 4-hour live location links to share with trusted contacts during remote runs.
4. **GDPR Account Deletion**: Cascades user profile, trackpoints, splits, and credentials completely.

---

## 📡 Progressive External API Configuration
STRIDE uses free and open-source infrastructure out of the box (zero initial billing):
- **GPS**: Native `navigator.geolocation` + realistic indoor simulation mode
- **Maps**: CartoDB Dark Matter & Positron tiles / OpenStreetMap
- **Routing**: Internal geodesic waypoint interpolation
- **Database**: Local SQLite (or PostgreSQL via `DATABASE_URL` in `.env`)
