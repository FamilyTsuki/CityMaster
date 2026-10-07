# 🛠️ TODO - Améliorations du Code & Architecture

Ce document répertorie l'ensemble des axes d'amélioration identifiés lors de l'audit complet de la base de code CityMaster, classés par priorité d'intervention.

---

## 🔴 Phase 1 : Sécurité Critique & Confidentialité

- [x] **1.1 Bloquer l'accès public au code source serveur (`/src/backend`)**
  - **Fichier** : [`server.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/server.js#L70)
  - **Problème** : `app.use("/src", express.static(...))` expose en clair tout le code backend (middlewares de sécurité, requêtes SQL, logique d'auth).
  - **Action** : Restreindre l'exposition statique aux seuls dossiers frontend nécessaires (`src/controllers`, `src/views`, `src/services`, `src/models`, `src/utils`, `src/app.js`, `src/Router.js`) et bloquer tout accès HTTP à `/src/backend`.

- [x] **1.2 Déplacer `users.json` hors du répertoire public statique**
  - **Fichier** : [`src/backend/models/User.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/backend/models/User.js#L8-L17)
  - **Problème** : `users.json` est situé dans `public/assets/data/users.json`, le rendant téléchargeable publiquement via le navigateur sans authentification.
  - **Action** : Déplacer le fichier de stockage de secours vers `config/users.json` ou un dossier `data/` situé hors de la racine web `public/`.

- [x] **1.3 Supprimer les écritures de log synchrones dans `/tmp`**
  - **Fichier** : [`src/backend/middleware/auth.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/backend/middleware/auth.js#L31-L37) et [L61-L67](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/backend/middleware/auth.js#L61-L67)
  - **Problème** : `fs.appendFileSync("/tmp/auth_debug.log", ...)` écrit de manière bloquante à chaque tentative admin rejetée et logue des données utilisateur.
  - **Action** : Supprimer ces traces de débogage temporaires ou utiliser un logger asynchrone non bloquant.

- [x] **1.4 Masquer les messages d'erreur internes (Status 500)**
  - **Fichiers** : [`ScoreController.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/backend/controllers/ScoreController.js#L11), [`CityController.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/backend/controllers/CityController.js#L27)
  - **Problème** : `res.status(500).json({ error: error.message })` divulgue les erreurs brutes de base de données aux clients.
  - **Action** : Remplacer par un message générique sécurisé (`error: "Une erreur interne est survenue"`) tout en conservant le log serveur (`console.error`).

---

## ⚡ Phase 2 : Performance & Scalabilité Serveur

- [ ] **2.1 Éliminer la lecture du fichier GeoJSON géant (347 Mo) dans `RoomController`**
  - **Fichier** : [`src/backend/controllers/RoomController.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/backend/controllers/RoomController.js#L153-L162)
  - **Problème** : À chaque polling de salon (toutes les 2 secondes par joueur), le serveur relit et parse `${room.city_key}.json` sur le disque pour extraire simplement `bbox` et `center`. Pour Lyon, le fichier pèse 347 Mo !
  - **Action** : Récupérer directement les métadonnées depuis `City.getAll()` ou `cities.json` qui les contiennent déjà sous forme légère (quelques Ko).

- [ ] **2.2 Remplacer les I/O synchrones bloquantes (`fs.readFileSync`)**
  - **Fichier** : [`src/backend/controllers/CityController.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/backend/controllers/CityController.js#L158-L175)
  - **Problème** : `fs.readFileSync` et `fs.existsSync` bloquent l'Event Loop de Node.js sur les gros fichiers de rues.
  - **Action** : Migrer vers `fs/promises` (`await fs.readFile`).

- [ ] **2.3 Mettre en cache mémoire RAM le référentiel des communes**
  - **Fichier** : [`src/backend/models/City.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/backend/models/City.js#L16-L42)
  - **Problème** : `City.getAll()` relit les fichiers `cities.json` et `custom_cities.json` à chaque recherche ou affichage.
  - **Action** : Garder la liste fusionnée en mémoire avec réinvalidation lors d'un appel à `saveCustomCity()`.

- [ ] **2.4 Regrouper les écritures disques dans `City.search()`**
  - **Fichier** : [`src/backend/models/City.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/backend/models/City.js#L164-L167)
  - **Problème** : `this.saveCustomCity()` est appelé dans une boucle `for` pour chaque commune trouvée par Nominatim, déclenchant plusieurs écritures consécutives du même fichier.
  - **Action** : Accumuler les nouvelles communes et effectuer une unique sauvegarde groupée en sortie de boucle.

- [ ] **2.5 Adapter le quota du Rate Limiter global pour les salons multijoueurs**
  - **Fichier** : [`src/backend/middleware/security.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/backend/middleware/security.js#L36-L42)
  - **Problème** : Le quota de 1000 requêtes / 15 min par IP bloque les utilisateurs connectés sur le même réseau local (ex: même Wi-Fi) en raison du polling (450 requêtes par joueur en 15 min).
  - **Action** : Rehausser la limite pour les routes authentifiées ou exclure le polling de ce compteur global strict.

---

## 📱 Phase 3 : PWA & Mode Hors-Ligne

- [ ] **3.1 Mettre en cache les fichiers JavaScript applicatifs dans le Service Worker**
  - **Fichier** : [`public/sw.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/public/sw.js#L2-L35)
  - **Problème** : `STATIC_ASSETS` ne liste que les CSS et icônes, mais aucun script JS (`/src/app.js`, contrôleurs, vues). En mode hors-ligne initial, l'application ne peut pas démarrer.
  - **Action** : Ajouter les scripts nécessaires à la liste `STATIC_ASSETS`.

- [ ] **3.2 Autoriser la mise en cache des bibliothèques cartographiques CDN (CORS)**
  - **Fichier** : [`public/sw.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/public/sw.js#L78)
  - **Problème** : La condition `networkResponse.type === 'basic'` ignore délibérément les requêtes cross-origin (`cors`), empêchant la mise en cache de Leaflet et de Turf.js.
  - **Action** : Autoriser le cache pour les réponses de type `'cors'` provenant de `unpkg.com` et `jsdelivr.net`.

- [ ] **3.3 Supprimer le cache-busting dynamique sur le favicon**
  - **Fichier** : [`public/index.html`](file:///home/tsuki/Documents/perso/Projects/CityMaster/public/index.html#L34)
  - **Problème** : `fav.href = '/favicon.png?v=' + Date.now()` force le re-téléchargement à chaque rechargement de page.
  - **Action** : Utiliser un identifiant de version fixe (ex: `?v=2.4.0`).

---

## 🏛️ Phase 4 : Architecture & Clean Code

- [ ] **4.1 Centraliser le nettoyage de fin de route dans le Router SPA**
  - **Fichiers** : [`src/Router.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/Router.js), [`src/app.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/app.js#L101-L157)
  - **Problème** : `this.#roomController?.stopPolling()` est dupliqué à la main dans 8 gestionnaires de routes différents.
  - **Action** : Implémenter un hook global `router.beforeEach()` ou un cycle de vie standardisé `destroy()`/`cleanup()` sur chaque contrôleur.

- [ ] **4.2 Isoler la route Catch-All des requêtes API dans `server.js`**
  - **Fichier** : [`server.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/server.js#L100-L102)
  - **Problème** : `app.get("*", ...)` renvoie `index.html` avec le code HTTP 200 pour toute URL inconnue, y compris `/api/*`.
  - **Action** : Restreindre le catch-all aux routes web `app.get(/^(?!\/api).*/, ...)` et ajouter un middleware 404 JSON dédié pour l'API.

- [ ] **4.3 Reclasser les imports en haut de `server.js`**
  - **Fichier** : [`server.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/server.js#L88)
  - **Problème** : `import fs from "fs";` est déclaré en plein milieu des routes.
  - **Action** : Déplacer l'import au sommet du fichier.

- [ ] **4.4 Sécuriser les contrôles d'accès côté client**
  - **Fichiers** : [`src/app.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/app.js#L134), [`RoomController.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/controllers/RoomController.js#L368)
  - **Problème** : Se baser sur `localStorage.getItem("is_admin")` est facilement falsifiable dans la console développeur.
  - **Action** : Toujours valider l'état du token auprès de l'API (`/api/profile`) avant d'accorder l'accès aux interfaces privilégiées.

---

## 🧪 Phase 5 : Tests & Qualité Logicielle

- [ ] **5.1 Tests unitaires pour `AuthController`**
  - Valider le format des pseudos (alphanumériques, longueur 3-30).
  - Valider la politique de mot de passe (min 6 caractères).
  - Vérifier la génération correcte du token JWT et le hachage bcrypt.

- [ ] **5.2 Tests unitaires pour `RoomController`**
  - Tester la génération de code de salon unique (6 caractères hexadécimaux).
  - Tester le rejet des salons expirés (1h, 24h, 7 jours).
  - Tester le mélange déterministe des rues via `test_id`.

- [ ] **5.3 Tests unitaires pour `ScoreController`**
  - Tester le rejet des scores négatifs ou non entiers.
  - Tester la déduplication `MAX(score)` du classement.

