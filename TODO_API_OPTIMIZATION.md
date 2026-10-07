# ⚡ TODO - Optimisation des Requêtes API & Performance Réseau

Ce document regroupe les actions concrètes pour réduire drastiquement la consommation de bande passante et la charge serveur, tout en accélérant les temps de chargement pour les joueurs.

---

## 🎯 Objectifs Clés
- **-70% à -90%** de bande passante consommée par joueur.
- **Démarrage instantané (0 ms)** des parties pour les villes déjà jouées.
- **Zéro risque de blocage de quota** sur les API publiques OpenStreetMap (Overpass & Nominatim).
- **Synchronisation multijoueur fluide** sans surcharger le serveur avec des requêtes répétitives.

---

## 🛑 Phase 1 : Suppression du Cache-Busting Forcé (Gain Immédiat)

- [ ] **1.1 Retirer le paramètre `?t=${Date.now()}` sur les fichiers GeoJSON de communes**
  - **Fichier** : [`src/services/OverpassService.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/services/OverpassService.js#L14)
  - **Ligne actuelle** :
    ```javascript
    const res = await ApiService.get(`/assets/data/${cityKey}.json?t=${Date.now()}`, { includeAuth: false });
    ```
  - **Correction** :
    ```javascript
    const res = await ApiService.get(`/assets/data/${cityKey}.json`, { includeAuth: false });
    ```
  - **Bénéfice** : Dès la deuxième partie sur une même commune, le navigateur réutilise son cache local ou valide en 1 aller-retour léger (`304 Not Modified`), économisant plusieurs méga-octets à chaque manche.

- [ ] **1.2 Retirer `?t=${Date.now()}` sur les fichiers de customisation**
  - **Fichier** : [`src/controllers/GameController.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/controllers/GameController.js#L446) et [L460](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/controllers/GameController.js#L460)
  - **Correction** : Supprimer l'horodatage sur `custom_districts.json` et `custom_routes.json`.
  - **Bénéfice** : Évite de retélécharger ces fichiers de configuration à chaque nouvelle partie.

- [ ] **1.3 Configurer les en-têtes HTTP de cache pour les données statiques dans `server.js`**
  - **Fichier** : [`server.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/server.js#L59-L66)
  - **Action** : Définir un en-tête `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` pour les fichiers `/assets/data/*.json` afin d'autoriser le cache navigateur longue durée tout en garantissant les mises à jour en tâche de fond.

---

## 💾 Phase 2 : Cache Local Persistant avec IndexedDB (0 requêtes au rejeu)

- [ ] **2.1 Créer un module de stockage local `StorageService` basé sur IndexedDB**
  - **Fichier cible** : `src/services/StorageService.js`
  - **Fonctionnalité** : Stocker les objets GeoJSON complets des communes téléchargées directement dans la base de données IndexedDB du navigateur (sans limite stricte de 5 Mo comme le `localStorage`).

- [ ] **2.2 Intégrer IndexedDB dans `OverpassService.js`**
  - **Workflow** :
    1. L'utilisateur lance une ville (ex: `bordeaux`).
    2. Vérifier si `bordeaux` est présent dans IndexedDB.
    3. Si oui : charger directement les données depuis le disque local du client (temps d'accès < 50 ms, 0 octet réseau).
    4. Si non : télécharger le fichier une seule fois depuis le serveur, puis le sauvegarder dans IndexedDB pour toutes les parties futures.

---

## 🔄 Phase 3 : Optimisation du Polling Multijoueur des Salons

- [ ] **3.1 Polling conditionnel léger (Hash d'état / ETag)**
  - **Fichier** : [`src/backend/controllers/RoomController.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/backend/controllers/RoomController.js#L131)
  - **Problème** : Les clients demandent l'état complet du salon toutes les 2 secondes, même si rien n'a bougé.
  - **Action** :
    - Ajouter un en-tête ou query param `version` ou `etag` basé sur le nombre de participants et la date de dernière mise à jour.
    - Si l'état n'a pas changé : le serveur répond immédiatement un statut HTTP `304 Not Modified` ou un payload minimal `{ changed: false }` de 20 octets au lieu de renvoyer tout le JSON du salon.

- [ ] **3.2 Alternative moderne : Migration vers Server-Sent Events (SSE)**
  - **Fichier cible** : `/api/rooms/:code/stream`
  - **Fonctionnalité** : Ouvrir une connexion HTTP persistante unidirectionnelle par client.
  - **Bénéfice** :
    - **0 requête répétée** : Plus aucun polling toutes les 2 secondes.
    - **Temps réel absolu (< 50 ms)** : Dès qu'un joueur rejoint ou termine, le serveur pousse l'événement immédiatement à tous les participants.

---

## 🌍 Phase 4 : Cache Serveur pour les APIs Publiques OpenStreetMap

- [ ] **4.1 Cache Serveur LRU pour l'API Overpass (`/api/overpass`)**
  - **Fichier** : [`src/backend/controllers/OverpassController.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/backend/controllers/OverpassController.js#L9)
  - **Problème** : Plusieurs requêtes identiques sollicitent à répétition les serveurs publics Overpass.
  - **Action** :
    - Créer un cache en mémoire (ou persistant sur disque) indexé par le hash de la requête Overpass.
    - Conserver les réponses valides pendant **24 heures à 7 jours**.
    - Si la même zone est demandée, renvoyer instantanément la réponse depuis le cache serveur sans aucun appel réseau sortant.

- [ ] **4.2 Cache Serveur pour les requêtes Nominatim (`City.search`)**
  - **Fichier** : [`src/backend/models/City.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/backend/models/City.js#L98)
  - **Action** :
    - Conserver en mémoire les résultats de recherche Nominatim récents (ex: pendant 1 heure).
    - Protège le serveur contre le risque de bannissement d'IP pour dépassement du quota de 1 requête / seconde imposé par la charte d'utilisation Nominatim.

- [ ] **4.3 Memoization côté client des recherches de villes**
  - **Fichiers** : [`AdminController.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/controllers/AdminController.js#L204), [`GameView.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/views/GameView.js#L207), [`RoomView.js`](file:///home/tsuki/Documents/perso/Projects/CityMaster/src/views/RoomView.js#L266)
  - **Action** : Garder en mémoire un dictionnaire local `{ [query]: results }`. Si l'utilisateur efface puis re-tape la même ville, aucun appel réseau n'est envoyé.

---

## 🗜️ Phase 5 : Allègement des Payloads & Requêtes Redondantes

- [ ] **5.1 Élaguer la réponse de `getRoom` dans `RoomController.js`**
  - Ne renvoyer que les champs strictement nécessaires pour l'affichage du lobby (pseudo, statut, avatar, score) sans injecter d'arborescences de métadonnées superflues.

- [ ] **5.2 Fusionner les vérifications au démarrage dans `app.js`**
  - Au chargement initial, l'application fait séparément un appel pour `/api/version` et `/api/profile`.
  - Possibilité de combiner ou de rendre asynchrone non-bloquant pour un temps de premier rendu (FCP) encore plus rapide.
