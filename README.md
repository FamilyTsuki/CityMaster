# 🌍 CityMaster

[![Play Online](https://img.shields.io/badge/Play%20Online-citymaster.tsuki--dev.fr-4f46e5?style=for-the-badge&logo=google-chrome&logoColor=white)](https://citymaster.tsuki-dev.fr)
[![Version](https://img.shields.io/badge/version-2.19.0-emerald?style=for-the-badge)](https://github.com/FamilyTsuki/CityMaster/releases)
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

## 🛠️ Développement

> Documentation technique (en français) : [architecture et synchronisation](docs/ARCHITECTURE.md) · [conventions, ajout de fonctionnalités, débogage](docs/CONTRIBUER.md).

### Technologies

- **Client** : JavaScript natif (modules ES, pas de framework ni de compilation), Leaflet, Turf.js, service worker (PWA), IndexedDB.
- **Serveur** : Node.js, Express, PostgreSQL (facultatif), jetons JWT.
- **Données** : OpenStreetMap via l'API Overpass, recherche de communes via Nominatim.

### Prérequis

- Node.js 20.11 ou plus récent, npm.
- PostgreSQL (facultatif) : sans base, le serveur démarre en **mode local** (comptes dans `config/users.json`, scores en mémoire, salons multijoueurs indisponibles).

### Installation et lancement

```bash
git clone https://github.com/FamilyTsuki/CityMaster.git
cd CityMaster
npm install
cp .env.example .env      # puis renseigner au moins JWT_SECRET
npm run dev               # http://localhost:3000, redémarre à chaque modification
```

En production : `npm start`. Il n'y a pas d'étape de compilation : les fichiers de `public/` et `src/` sont servis tels quels. Les variables d'environnement sont décrites dans [`.env.example`](.env.example).

Donner les droits d'administration à un compte existant : `npm run make-admin -- <pseudo>`.

### Vérifications

```bash
npm run lint    # ESLint
npm test        # tests node:test (données isolées dans un dossier temporaire)
npm run check   # les deux, à lancer avant chaque commit
```

### Structure

```
server.js            Démarrage du serveur
src/backend/         API Express : routes, contrôleurs, modèles, stockage
src/app.js           Démarrage du client (écrans, routes)
src/controllers/     Logique des écrans
src/views/           DOM et carte Leaflet
src/services/        Services du client, dont les règles partagées avec le serveur
public/              index.html, service worker, écrans HTML, styles, traductions
public/assets/data/  Données de carte générées (non versionnées)
config/cities.json   Liste de base des communes
tests/               Tests automatisés
docs/                Documentation technique
```

### Problèmes courants

| Symptôme | Solution |
|---|---|
| `FATAL ERROR: JWT_SECRET ...` | Créer `.env` à partir de `.env.example` |
| Salons en erreur 503 | PostgreSQL injoignable : vérifier `PG*` dans `.env` et la ligne `[db]` au démarrage |
| Limite de connexions atteinte pour tout le monde | Serveur derrière un proxy : définir `TRUST_PROXY=1` |
| Ancienne version affichée | Recharger en vidant le cache ; `CACHE_NAME` de `public/sw.js` doit changer à chaque version |

Plus de cas dans [docs/CONTRIBUER.md](docs/CONTRIBUER.md#déboguer).

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
