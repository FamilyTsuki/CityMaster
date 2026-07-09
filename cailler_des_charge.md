
### **Cahier des Charges Technique : Projet CityMaster (Version Open Source)**

---

#### **1. Présentation et Objectifs**

* **Projet :** Application web de type "Serious Game" géographique.
* **Objectif :** Faciliter l'apprentissage de la topologie d'une ville (rues, quartiers, points d'intérêt).
* **Récompense :** Obtention d'un certificat de réussite basé sur un système de score.

#### **2. Fonctionnalités Principales (Les 3 Modes)**

1. **Mode Target :** Affichage d'un nom de rue en texte. L'utilisateur doit cliquer sur la carte vierge à l'emplacement exact.
2. **Mode Identify :** Une zone/rue est surlignée sur la carte. L'utilisateur doit retrouver son nom.
3. **Mode Immersion :** Intégration d'une vue photographique à 360° de la rue. L'utilisateur place un repère sur la carte 2D globale pour deviner sa position.

#### **3. Architecture et Traitement des Données**

* **Source de données cartographiques :** OpenStreetMap (OSM). Récupération des tracés de rues via l'API Overpass (qui permet d'extraire les données OSM au format GeoJSON).
* **Traitement spatial côté client :** Utilisation de la bibliothèque **Turf.js**. Elle est indispensable pour calculer le *buffer* (gonfler la ligne de rue) afin de générer un polygone cliquable plus large et ergonomique pour le joueur.
* **Données immersives (360°) :** Intégration de l'API Mapillary (ou KartaView), qui propose des images Street View crowdsourcées et accessibles gratuitement.

#### **4. Les Options d'API Cartographiques (Frontend)**

Pour afficher la carte et interagir avec, trois grandes bibliothèques open source s'offrent à toi.

* **Leaflet :** Le standard historique. Extrêmement léger, facile à apprendre et doté d'un écosystème de plugins gigantesque. Il utilise des tuiles matricielles (images PNG/JPG).
* **MapLibre GL JS :** Le standard moderne. Il utilise des tuiles vectorielles et WebGL, ce qui permet un zoom ultra-fluide, des rotations de caméra dynamiques et de la 3D.
* **OpenLayers :** Le poids lourd. Très puissant pour les applications SIG (Systèmes d'Information Géographique) complexes, mais sa courbe d'apprentissage est plus raide.

---

### **Comparatif des Solutions Front-end (Affichage de la carte)**

| API | Force principale | Comparatif des prix | Durée de vie / Pérennité |
| --- | --- | --- | --- |
| **Leaflet** | Simplicité d'intégration, légèreté absolue et documentation très accessible. Idéal pour des projets rapides en 2D classique. | **100% Gratuit** (Open Source). Les tuiles de base OSM sont gratuites (mais limitées en charge). | **Excellente.** Projet mature (plus de 10 ans), très stable, soutenu par une communauté massive. Ne bougera pas de sitôt. |
| **MapLibre GL JS** | Performances WebGL exceptionnelles (zoom fluide, rotation 360 de la carte), support natif du format vectoriel et rendu très moderne. | **100% Gratuit** (Open Source). Nécessite un fournisseur de tuiles vectorielles (ex: MapTiler, gratuit jusqu'à 100k requêtes/mois, ou auto-hébergement gratuit). | **Très bonne.** Fork de Mapbox (quand ils sont devenus payants), soutenu par de grandes entreprises tech (AWS, Meta, Microsoft). Forte dynamique actuelle. |
| **OpenLayers** | Puissance d'analyse spatiale native, gestion de très gros volumes de données géographiques complexes et précision absolue. | **100% Gratuit** (Open Source). Mêmes conditions que Leaflet pour l'hébergement des tuiles. | **Excellente.** Très ancré dans les milieux professionnels et institutionnels de la cartographie. |

---

#### **5. Architecture Logicielle et Arborescence (MVC & POO)**

Le projet utilise l'architecture Modèle-Vue-Contrôleur (MVC) combinée aux principes de la Programmation Orientée Objet (POO) pour séparer la logique métier, l'affichage cartographique et la gestion des interactions.

```text
CityMaster/
├── config/                  # Configuration files
│   ├── api_config.json      # API keys and endpoints (Mapillary, Overpass)
│   └── game_rules.json      # Game configuration (timer, score systems)
├── public/                  # Static assets served directly by the web server
│   ├── assets/
│   │   ├── images/          # UI icons, logos
│   │   └── styles/          # CSS stylesheets (vanilla CSS only)
│   └── index.html           # Main entry point HTML file
├── src/                     # Application source code
│   ├── controllers/         # Handles user input and coordinates Models and Views
│   │   ├── GameController.js
│   │   ├── MapController.js
│   │   └── ScoreController.js
│   ├── models/              # Business logic and data management
│   │   ├── GameSession.js
│   │   ├── Player.js
│   │   └── Street.js
│   ├── views/               # Handles the rendering of user interface components
│   │   ├── CertificateView.js
│   │   ├── GameView.js
│   │   └── MapView.js
│   ├── services/            # Integrations with external APIs and libraries
│   │   ├── MapillaryService.js
│   │   ├── OverpassService.js
│   │   └── SpatialService.js  # Wrapper for Turf.js geometry calculations
│   └── app.js               # Application bootstrap and router
├── tests/                   # Test suite for unit and integration testing
│   ├── controllers/
│   ├── models/
│   └── services/
├── .env.example             # Template for environment variables
├── .gitignore               # Excluded files in Git
├── LICENSE                  # Open source license details
└── README.md                # Project documentation and setup guide
```

##### **Responsabilités des Composants :**

* **Models (`src/models/`)** : Gèrent les données et les règles métier (ex. `Street.js` pour représenter une rue, `GameSession.js` pour l'état d'une partie et les scores, `Player.js` pour le profil).
* **Views (`src/views/`)** : Gèrent le rendu visuel et capturent les événements du DOM (ex. `MapView.js` pour interagir avec Leaflet/MapLibre, `GameView.js` pour l'interface utilisateur, `CertificateView.js` pour la réussite).
* **Controllers (`src/controllers/`)** : Servent d'intermédiaire pour synchroniser les modèles et rafraîchir les vues (ex. `GameController.js` pour la boucle de jeu principale).
* **Services (`src/services/`)** : Isolent les appels aux API tierces (`OverpassService.js` pour OSM, `MapillaryService.js` pour le 360°, et `SpatialService.js` pour les calculs de polygones Turf.js).

