# 🌍 CityMaster

[![Play Online](https://img.shields.io/badge/Play%20Online-citymaster.tsuki--dev.fr-4f46e5?style=for-the-badge&logo=google-chrome&logoColor=white)](https://citymaster.tsuki-dev.fr)
[![Version](https://img.shields.io/badge/version-2.5.0-emerald?style=for-the-badge)](https://github.com/FamilyTsuki/CityMaster/releases)
[![PWA Ready](https://img.shields.io/badge/PWA-installable%20%26%20offline-blue?style=for-the-badge&logo=pwa&logoColor=white)](https://citymaster.tsuki-dev.fr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

> **Master the geography of your city!**  
> An open-source geographic serious game powered by OpenStreetMap, Leaflet, and Turf.js. Learn streets, boulevards, and neighborhoods through real-time challenges and multiplayer rooms.

👉 **Play immediately in your browser — No installation required:**  
### 🎮 [**https://citymaster.tsuki-dev.fr**](https://citymaster.tsuki-dev.fr)

---

## 🌐 Instant Web Access & PWA

CityMaster is designed as a zero-friction, cross-platform web application:

- **🚀 Instant Play**: Open [citymaster.tsuki-dev.fr](https://citymaster.tsuki-dev.fr) on any desktop, tablet, or smartphone browser. No account needed for guest sessions.
- **📱 Progressive Web App (PWA)**: Install CityMaster directly to your home screen or desktop with a single tap or click for a native full-screen app experience.
- **⚡ Offline Support**: Core assets and offline caching via Service Worker ensure smooth performance even on unstable connections.
- **🔐 One-Click Google Authentication**: Quick sign-in with Google Identity Services (with dynamic dark/light theme) or standard credentials to track your stats, scores, and certificates.

---

## 🌟 Key Features

### 🎮 Game Modes & Challenges
- **Solo Training**: Test your knowledge on any French commune with immediate geographical feedback, distance calculations, and progressive scoring.
- **Multiplayer Competition**:
  - **Create or Join Rooms**: Host private or public multiplayer rooms using a 6-character room code or shareable direct link.
  - **Synchronized Difficulty**: Filter streets dynamically by length, arterial hierarchy (boulevards, avenues), or neighborhood polygons.
  - **Deterministic Shuffling**: All players face the exact same sequence of challenges in real time.
  - **Live Leaderboard**: Real-time standings with personal record highlights.

### 🗺️ High-Precision Map Engine
- **Esri World Imagery HD Satellite**: High-resolution satellite tiles everywhere by default.
- **Real-Time OpenStreetMap Data**: Dynamic street fetching via Overpass API with intelligent local caching.
- **Spatial Topology with Turf.js**: Robust line merging, centroid distance calculation, and district polygon validation.

### 🏆 Profiles & Official Certificates
- **Detailed Player Stats**: Track games played, average accuracy, and best scores.
- **Downloadable Certificates**: Generate official CityMaster diplomas for completed runs.

### 🛠️ Administration & City Verification
- **Verified Cities Badge (`✓ Validée`)**: Administrative tools to inspect and mark clean city maps.
- **Interactive Route & Geometry Editor**: Adjust coordinates, fix street names, and define custom districts.
- **Player Feedback System**: Review community reports on map issues directly within the admin dashboard.

---

## 🏗️ Architecture

CityMaster follows a clean, modular **MVC (Model-View-Controller)** pattern with Vanilla JavaScript (ES6+), CSS tokens, and Node.js/Express.

```
CityMaster/
├── config/              # Server configuration and isolated custom cities data
├── public/              # Client static assets (PWA manifest, stylesheets, i18n, screens)
│   ├── assets/i18n/     # Complete English & French localization dictionaries
│   └── assets/styles/   # Unified neumorphic CSS tokens and responsive themes
├── src/
│   ├── backend/         # Express REST API, auth middleware, and PostgreSQL/JSON models
│   ├── controllers/     # Client MVC controllers (Game, Room, Admin, Auth, Profile)
│   ├── models/          # Domain entities, session state, and scoring logic
│   ├── services/        # Centralized ApiService, OverpassService, RouteDifficultyService
│   └── views/           # Client MVC views (Admin, Game, Map, Room, Certificate)
├── server.js            # Node.js Express server entry point
├── CHANGELOG.md         # Full release changelog (v2.0.0 through v2.5.0)
└── package.json         # Project metadata and dependencies
```

---

<details>
<summary>💻 <b>Self-Hosting & Local Development (Optional)</b></summary>

<br>

If you want to contribute or self-host CityMaster locally:

### Prerequisites
- **Node.js** v18+ (v20+ recommended)
- **npm** v9+
- *(Optional)* PostgreSQL database (automatic fallback to local JSON storage if unconfigured)

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/FamilyTsuki/CityMaster.git
   cd CityMaster
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root folder:
   ```env
   PORT=3000
   JWT_SECRET=your_jwt_secret_key_here
   # Optional: GOOGLE_CLIENT_ID for Google Sign-In
   # Optional: DATABASE_URL=postgres://user:password@localhost:5432/citymaster
   ```

4. **Start the server**:
   ```bash
   npm run dev    # Development mode with --watch
   npm start      # Production mode
   ```

5. **Run tests**:
   ```bash
   npm test       # Run complete test suite (24 tests)
   ```

</details>

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
