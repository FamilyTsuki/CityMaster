# Architecture de CityMaster

Ce document explique comment le projet fonctionne, où se trouve chaque donnée et comment les différentes parties restent synchronisées. Pour les conventions et la marche à suivre au quotidien, voir [CONTRIBUER.md](CONTRIBUER.md).

## Vue d'ensemble

CityMaster est un jeu de géographie urbaine : le joueur doit situer des rues réelles (données OpenStreetMap) sur une carte, ou reconnaître une rue tracée.

| Partie | Technologie | Point d'entrée |
|---|---|---|
| Client | JavaScript natif (modules ES), Leaflet et Turf.js chargés depuis un CDN, PWA | `public/index.html` → `src/app.js` |
| Serveur | Node.js + Express | `server.js` → `src/backend/app.js` |
| Base de données | PostgreSQL (facultatif, voir « Modes de stockage ») | `src/backend/config/database.js` |
| Données de carte | Fichiers GeoJSON générés depuis l'API Overpass | `public/assets/data/` |

Il n'y a pas d'étape de compilation : le serveur sert directement les fichiers de `public/` et de `src/` (sauf `src/backend/`, bloqué).

Modes de jeu : `target` (cliquer sur la rue demandée), `sprint` (un clic = une réponse, gros bonus de temps), `identify` (taper le nom de la rue tracée). Difficultés : `easy`, `medium`, `hard`, `lotissement`.

## Arborescence

```
server.js                    Démarrage : vérifie JWT_SECRET, initDB(), écoute le port
src/
  app.js                     Client : charge les écrans HTML, crée vues et contrôleurs, déclare les routes
  Router.js                  Routeur côté client (history API)
  controllers/               Logique des écrans (jeu, salons, admin, compte, profil, classements)
  views/                     Manipulation du DOM et de la carte Leaflet
  models/GameSession.js      État de la partie côté client (sauvegardé dans localStorage)
  services/                  Services du client ; certains sont partagés avec le serveur :
    ScoringService.js          règles de score et durées (partagé)
    RouteDifficultyService.js  classement des rues par difficulté (partagé)
    SpatialService.js          fonctions de géométrie pures (partagées) + classe navigateur
    ApiService.js              appels HTTP, ajoute le jeton JWT
    StorageService.js          cache IndexedDB des villes
    OverpassService.js         chargement des rues d'une ville (fichier serveur, cache, Overpass)
  utils/security.js          escapeHTML()
  backend/
    app.js                   Construction de l'application Express (middlewares, statiques, routes)
    config/database.js       Pool PostgreSQL, schéma, choix du mode de stockage
    config/paths.js          Tous les chemins de fichiers du serveur
    routes/                  Déclaration des routes /api/...
    controllers/             Traitement des requêtes HTTP
    models/                  Accès aux données (PostgreSQL ou fichiers JSON)
    services/CityStreetsService.js  Rues jouables d'une ville (utilisé par le jeu et par /difficulties)
    middleware/auth.js       Authentification JWT, accès admin
    middleware/security.js   Helmet (CSP) et limites de débit
    utils/game.js            Jeton de partie chiffré, distance à une rue
    utils/jsonStore.js       Lecture/écriture sûres des fichiers JSON
public/
  index.html, sw.js, manifest.json
  screens/*.html             Un gabarit HTML par écran, injecté au démarrage
  assets/i18n/{fr,en}.json   Traductions
  assets/styles/             CSS
  assets/data/               Données de carte générées (non versionnées)
config/cities.json           Liste de base des villes (versionnée)
scripts/                     make-admin, bump-version, génération d'icônes
tests/                       Tests node:test (+ setup.js et helpers.js)
docs/                        Cette documentation
```

## Déroulement d'une partie

1. **Configuration** (`/setup`) : le joueur choisit une ville. `GET /api/cities/:key/difficulties` indique les difficultés disponibles (au moins 5 rues).
2. **Génération de la ville** : `POST /api/cities/generate` crée `public/assets/data/<ville>.json` depuis Overpass si le fichier n'existe pas encore (une seule génération à la fois par ville).
3. **Début de partie** : `POST /api/game/start`. Le serveur (`CityStreetsService.getPlayableStreets`) charge le fichier de la ville, applique les modifications de l'administration, calcule la difficulté de chaque rue, tire les rues (`pickStreets`) et renvoie :
   - un **jeton de partie** chiffré (AES-256-GCM) qui contient toute la partie, rues comprises ;
   - la première consigne (`nextPrompt`), avec la durée de la manche (`timeLimit`).
4. **Affichage** : le client charge en parallèle la carte et les rues de la ville (`OverpassService.fetchStreets`) pour l'aimantation des clics et l'autocomplétion.
5. **Chaque manche** : `POST /api/game/submit-round` avec le jeton, la réponse et le temps écoulé. Le serveur calcule le score (`ScoringService.evaluateRound`) et renvoie un nouveau jeton, le retour de la manche, la consigne suivante et le score cumulé.
6. **Fin de partie** : le serveur enregistre lui-même le score final (`Score.create`). Le client affiche le certificat, ou renvoie au salon pour une partie multijoueur.

Le client ne calcule jamais le score d'une partie en ligne. En mode hors-ligne (ville déjà en cache, pas de réseau), le client applique les mêmes règles via `ScoringService`, mais le score n'est pas enregistré.

## Sources de vérité

| Donnée | Mode PostgreSQL | Mode local | Copies côté client | Synchronisation |
|---|---|---|---|---|
| Comptes | table `users` | `config/users.json` | `localStorage` : `token`, `username`, `is_admin` (affichage seulement) | Les droits admin sont relus côté serveur à chaque requête admin |
| Scores | table `scores` | mémoire (perdus au redémarrage) | aucune | Écrits uniquement par le serveur en fin de partie |
| Partie en cours | jeton chiffré détenu par le client | idem | `localStorage.citymaster_session` | Voir « Jeton de partie » |
| Salons | tables `rooms`, `room_participants` | indisponibles (503) | aucune | SSE + interrogation de secours |
| Signalements | table `reports` | mémoire | aucune | — |
| Réglages globaux | table `global_settings` (+ copie `global_settings.json`) | `public/assets/data/global_settings.json` | `localStorage.citymaster_disable_places` (mode hors-ligne) | `Settings.getAll()` est la seule lecture, utilisée par l'admin et par le jeu |
| Difficultés forcées | table `route_difficulties` (+ copie `difficulty_overrides.json`) | `difficulty_overrides.json` | — | `CityCustomization.getDifficultyOverrides()` |
| Rues et quartiers ajoutés par l'admin | `custom_routes.json`, `custom_districts.json` | idem | lus directement par le navigateur | Servis avec revalidation (`no-cache` + ETag) |
| Données de ville | `public/assets/data/<ville>.json` | idem | IndexedDB (`citymaster_storage`) | Revalidation par ETag à chaque partie |
| Liste des villes | `config/cities.json` + `config/custom_cities.json` | idem | `localStorage.citymaster_last_city` | Cache serveur de 60 s |

## Modes de stockage

`initDB()` est appelée au démarrage :

- `DB_DISABLED=true`, ou base inutilisable (base inexistante, identifiants refusés) : **mode local**, indiqué dans le journal ;
- base pas encore joignable (connexion refusée, base en cours de démarrage, réseau) : le serveur **attend la base** (`isDatabasePending()`) et retente en arrière-plan après 2 s, 5 s, 10 s puis toutes les 30 s. En attendant, la connexion (invités compris), le profil, l'administration et les salons répondent 503 ;
- sinon il crée/met à jour le schéma, passe en **mode PostgreSQL**, puis ajoute à la base les comptes de `users.json` qui n'y sont pas (`User.importFileUsersIntoDatabase`, sans effet sur les comptes existants). Les versions avant 2.19.0 enregistraient les inscriptions dans ce fichier quand la base ne répondait pas.

Une fois en mode PostgreSQL, le mode ne change plus. Chaque modèle (`src/backend/models/`) teste `isDatabaseEnabled()` et utilise **soit** la base **soit** le stockage local, jamais les deux pour la même donnée. Conséquences voulues :

- une erreur PostgreSQL en cours de fonctionnement remonte en erreur 500 explicite au lieu d'écrire en silence ailleurs ;
- les identifiants de `users.json` (qui recouvrent ceux de la base) ne sont jamais utilisés en mode PostgreSQL, et un jeton dont le pseudo ne correspond pas au compte de même identifiant n'ouvre aucun droit (`User.findForSession`) ;
- en attendant la base, rien n'est écrit dans `users.json` ni dans les seuls fichiers de réglages : la base reste la référence quand elle revient.

Les fichiers JSON passent par `src/backend/utils/jsonStore.js` : écriture dans un fichier temporaire puis renommage (pas de fichier à moitié écrit), et mises à jour d'un même fichier exécutées l'une après l'autre (pas de modification perdue). Un fichier JSON illisible provoque une erreur au lieu d'être remplacé par un fichier vide. Les liens symboliques sont suivis, les droits du fichier conservés, et si le dossier n'est pas modifiable par le serveur, le fichier est réécrit directement.

Les fichiers de données du serveur sont ignorés par git : voir [DEPLOIEMENT.md](DEPLOIEMENT.md) pour les mettre à jour sans risque.

## Synchronisation

### Jeton de partie

Le serveur ne garde pas les parties : tout l'état est dans le jeton chiffré que le client renvoie à chaque manche (`src/backend/utils/game.js`). AES-GCM détecte toute modification du jeton.

Pour empêcher le rejeu d'un même jeton (double clic, nouvel essai après une coupure réseau, ou triche en renvoyant un jeton après avoir vu la réponse), `GameController` garde en mémoire, pour chaque partie, la réponse de la dernière manche traitée :

- même jeton renvoyé → même réponse, sans nouveau calcul ni nouveau score ;
- jeton plus ancien → `409 STALE_GAME_TOKEN`.

Le client traite les codes `INVALID_GAME_TOKEN`, `GAME_SESSION_MISMATCH`, `STALE_GAME_TOKEN` et `GAME_FINISHED` en abandonnant proprement la partie sauvegardée (`GameController.#recoverFromInvalidSession`). Ce cache est perdu au redémarrage du serveur (limite acceptée).

Côté client, le mode sprint passe à l'état `submitting` avant l'envoi : un double clic ou un clic au moment où le temps expire n'envoie qu'une réponse.

Le temps écoulé envoyé par le client n'est pas vérifié par le serveur (le serveur ne sait pas quand le joueur a commencé la manche) : c'est une limite connue.

### Salons multijoueurs

- Tous les joueurs reçoivent les mêmes rues : le numéro de test du salon (`test_id`, unique) sert de graine à `seededRandom`, et le serveur impose la ville, le mode, la difficulté et le nombre de rues du salon.
- Mises à jour en direct par SSE (`GET /api/rooms/:code/stream`, avec un commentaire `: ping` toutes les 25 s pour les proxys). En cas d'erreur SSE, le client interroge `GET /api/rooms/:code?v=<version>` toutes les 2,5 s ; `version` est une empreinte de l'état du salon qui évite de renvoyer des données inchangées.
- Le client ignore toute réponse qui ne concerne plus le salon affiché (`RoomController.#isCurrentRoom`).
- Le score de salon est envoyé par le client (`POST /submit-score`) ; le serveur refuse les valeurs impossibles (`MAX_POINTS_PER_ROUND` × nombre de rues).

### Caches du navigateur

- **IndexedDB** (`StorageService`) : données GeoJSON des villes, avec leur ETag. `OverpassService.fetchStreets` renvoie le cache si le serveur répond 304, le remplace si le fichier a changé, et l'utilise seul hors-ligne.
- **Service worker** (`public/sw.js`) : réseau d'abord, cache en secours. Les modules listés dans `STATIC_ASSETS` sont pré-cachés à l'installation (un test vérifie que tous les modules de `src/` y figurent). Les gros fichiers de villes ne sont pas dupliqués dans ce cache. Changer `CACHE_NAME` (fait par `bump-version`) force la mise à jour.
- **localStorage** : session (`token`, `username`, `is_admin`, `is_guest`, `citymaster_profile_image`), partie en cours (`citymaster_session`), préférences (`theme`, `lang`, `sound_muted`, `haptic_enabled`, `citymaster_last_*`). La déconnexion supprime la session et la partie en cours.

## Code partagé entre client et serveur

`ScoringService.js`, `RouteDifficultyService.js` et les fonctions exportées de `SpatialService.js` sont importés par les deux côtés. Règles :

- pas d'accès au DOM, à `window` ni à la variable globale `turf` (elle n'existe que dans le navigateur) ;
- les calculs géographiques reprennent les formules de Turf.js ; `tests/difficulty_consistency.test.js` vérifie qu'ils donnent les mêmes résultats.

## Sécurité

- **Authentification** : JWT (30 jours, 3 h pour les invités) dans l'en-tête `Authorization`. Le paramètre `?token=` n'est accepté que pour le flux SSE.
- **Administration** : `requireAdmin` relit les droits dans le stockage des comptes (identifiant et pseudo du jeton doivent correspondre) ; les invités ne sont jamais administrateurs et ne peuvent pas prendre un pseudo listé dans `ADMIN_USERS`.
- **Entrées** : clés de ville limitées à `[a-z0-9_]`, modes/difficultés/réglages limités aux valeurs connues, champs de signalement tronqués à la taille des colonnes.
- **HTML** : tout texte externe (noms de rues OSM, messages du serveur) est soit inséré avec `textContent`, soit passé par `escapeHTML()`.
- **Limites de débit** : `express-rate-limit` (connexion, global, salons). Derrière un reverse proxy, définir `TRUST_PROXY`.
- **Relais Overpass** : requêtes limitées à 2 000 caractères, cache borné à 100 Mo.
- La CSP autorise `'unsafe-inline'` et `'unsafe-eval'` (scripts inline de `index.html`) : à resserrer si ces scripts sont déplacés dans des fichiers.

## Limites connues

- `public/assets/data/lyon.json` local pèse 363 Mo (97 975 tronçons, ancien format sans `highway`) : chaque partie à Lyon le relit entièrement côté serveur et le navigateur le télécharge. Le supprimer le fait régénérer au format actuel ; les modifications des admins, rangées dans d'autres fichiers et liées aux noms de rues, restent appliquées. Sur le serveur, sauvegarder avant (voir [DEPLOIEMENT.md](DEPLOIEMENT.md)).
- Le cache anti-rejeu et le cache Overpass sont en mémoire : perdus au redémarrage, non partagés entre plusieurs instances du serveur.
- En mode local, scores et signalements sont perdus au redémarrage.
- Le mode `center` compte les voisins dans un rayon de 200 m pour chaque rue : rapide grâce à une grille, mais recalculé à chaque début de partie.
