# CityMaster

**CityMaster** is a modern, open-source geographic serious game designed to help users master city topology (streets, avenues, boulevards, neighborhoods, and lotissements) through single-player and real-time multiplayer interactive game modes.

---

## 🌟 Key Features

- **Single Player & Multiplayer**:
  - **Solo Mode**: Practice city streets with immediate geographical feedback and distance scoring.
  - **Multiplayer Rooms**: Create or join multiplayer rooms with room code. Supports registered accounts and quick guest access.
  - **Host Controls & Real-Time Sync**: Synchronized difficulty modes, deterministic street shuffling, and live player standings.
- **Game & Difficulty Modes**:
  - **By Length**: Filtered by street length (>800m, 250m–800m, <250m).
  - **By Nomenclature**: Major thoroughfares (boulevards, avenues) vs. secondary ways.
  - **By City Center**: Intersection density-based classification.
  - **Districts & Lotissements**: Custom polygon-based neighborhood recognition.
- **Interactive Map Engine**:
  - HD Esri World Imagery Satellite view powered by Leaflet.js.
  - Spatial calculations using Turf.js.
  - Dynamic real-time street fetching via OpenStreetMap Overpass API with local data caching.
- **Administration Dashboard**:
  - **City Verification System**: Verify and mark clean city maps with verified badges (`✓ Validée`).
  - **Custom Geometry Editor**: Add and edit custom routes (polylines) and districts (polygons) with vertex drag handles.
  - **Camera Focus & Street Highlighting**: Click any street in the admin panel list to highlight the route and focus map camera bounds (`fitBounds`).
  - **Player Report Management**: Review, resolve, or dismiss user feedback on map errors or street names.
- **User Profiles & Certificates**:
  - Score history, stats, profile avatars, and downloadable performance certificates.

---

## 🏗️ Architecture

Built with a modular, strict **MVC (Model-View-Controller)** pattern in Vanilla JavaScript (ES6+), Node.js, and Express.

```
CityMaster/
├── config/              # Server configuration and database scripts
├── public/              # Client static assets (CSS, screens, icons, landing)
├── scripts/             # Admin and maintenance scripts
├── src/
│   ├── backend/         # Express REST API routes and controllers
│   ├── controllers/     # Client MVC controllers (Admin, Auth, Game, Room, Profile)
│   ├── models/          # Domain entities, session state, and scoring logic
│   ├── services/        # External services (Overpass API, Turf.js wrapper)
│   ├── utils/           # Helper utilities
│   ├── views/           # Client MVC views (Admin, Game, Map, Room, Certificate)
│   ├── Router.js        # Client Single Page Application (SPA) Router
│   └── app.js           # Client application bootstrapper
├── server.js            # Node.js Express server entry point
├── CHANGELOG.md         # Full release changelog
└── package.json         # Project metadata and dependencies
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ (v20+ recommended)
- **npm** v9+
- *(Optional)* **PostgreSQL** database (falls back to local JSON/SQLite storage if unconfigured)

### Installation

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
   Copy `.env` configuration file or create one in the root folder:
   ```env
   PORT=3000
   JWT_SECRET=your_jwt_secret_key_here
   # DATABASE_URL=postgres://user:password@localhost:5432/citymaster
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```

5. **Open in Browser**:
   Navigate to `http://localhost:3000` in your web browser.

---

## 🛠️ Scripts

- `npm run dev` — Starts the server in watch mode using Node.js `--watch`.
- `npm start` — Runs the server in production mode.
- `npm run make-admin` — Grants administrator privileges to a user account.

---

## 📜 License

This project is licensed under the MIT License.
