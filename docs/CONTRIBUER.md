# Travailler sur CityMaster

Guide pratique : conventions, ajout d'une fonctionnalité, débogage et vérifications avant de terminer. Le fonctionnement général est décrit dans [ARCHITECTURE.md](ARCHITECTURE.md).

## Commandes

| Commande | Rôle |
|---|---|
| `npm install` | Installer les dépendances |
| `npm run dev` | Serveur avec redémarrage automatique (`node --watch`) |
| `npm start` | Serveur en production |
| `npm test` | Tous les tests (`tests/*.test.js`) |
| `npm run lint` | ESLint (erreurs réelles uniquement, pas de style) |
| `npm run check` | Lint puis tests : à lancer avant chaque commit |
| `npm run make-admin -- <pseudo>` | Donner les droits admin (`--revoke` pour les retirer) |
| `npm run version:bump -- <patch\|minor\|major>` | Incrémenter la version partout |

Lancer un seul fichier de test : `node --import ./tests/setup.js --test tests/game_round.test.js`.

## Conventions

- Modules ES, guillemets simples dans le nouveau code (une partie de l'ancien code utilise encore des doubles).
- Pas de `console.log` de débogage laissé dans le code ; `console.error` / `console.warn` pour les vraies erreurs.
- Jamais de `catch {}` vide qui cache une erreur : journaliser, renvoyer une erreur HTTP explicite, ou laisser remonter.
- Le serveur ne fait jamais confiance au client pour un score, un droit ou un identifiant : il recalcule ou relit.
- Le code de `src/services/` importé par le serveur ne doit utiliser ni `document`, ni `window`, ni `turf` global.
- Tout texte venant de l'extérieur affiché en HTML passe par `textContent` ou `escapeHTML()`.
- Chaque modification suit les règles de version et de changelog d'`AGENTS.md` (version dans 4 fichiers, entrée Keep a Changelog, copie dans `public/CHANGELOG.md`).

## Tests

- `tests/setup.js` est chargé avant chaque fichier de test : dossiers de données temporaires, PostgreSQL désactivé, secret JWT de test. Les tests ne modifient donc jamais `public/assets/data/` ni `config/`.
- `tests/helpers.js` fournit `createMockRes()` (réponse Express factice), `writeDataFile()` et `makeCity()` / `makeStreet()` pour fabriquer des villes de test.
- Un contrôleur se teste en l'appelant directement avec un faux `req`/`res` ; une route complète avec `createApp()` (voir `tests/api_routes.test.js`).
- Pour un bug corrigé, ajouter un test qui échouait avant la correction.

## Ajouter une fonctionnalité

### Une route API

1. Écrire le traitement dans un contrôleur de `src/backend/controllers/` (valider chaque champ de `req.body`, répondre 400 sur une entrée invalide, `console.error` + 500 sinon).
2. Mettre l'accès aux données dans un modèle de `src/backend/models/`, avec les deux branches `isDatabaseEnabled()` si la donnée existe aussi en mode local.
3. Déclarer la route dans `src/backend/routes/*.routes.js` avec le bon middleware (`authenticateToken`, `requireAdmin`, `optionalAuth`).
4. Si c'est un nouveau fichier de routes, le monter dans `src/backend/app.js`.
5. Côté client, appeler la route avec `ApiService.get/post(...)` et tester `res.ok`.
6. Ajouter un test (contrôleur ou `api_routes.test.js`).

Exemple existant complet : les signalements (`routes/reports.routes.js` → `controllers/ReportController.js` → `models/Report.js`, appelés depuis `GameView`).

### Un écran

1. Créer `public/screens/<nom>.html` avec un élément racine `id="<nom>-screen" class="screen"` (affiché par `GameView.showScreen("<nom>")`).
2. L'ajouter à la liste `screens` de `src/app.js` et déclarer sa route dans le `Router`.
3. Mettre ses textes dans `public/assets/i18n/fr.json` **et** `en.json` (un test vérifie que les deux ont les mêmes clés).
4. Si l'écran a un nouveau module JS, l'ajouter à `STATIC_ASSETS` dans `public/sw.js` (un test le vérifie).

### Une règle de jeu

- Score, bonus, durée des manches : `src/services/ScoringService.js` (s'applique en ligne et hors-ligne).
- Classement des rues par difficulté : `src/services/RouteDifficultyService.js`.
- Choix des rues d'une partie : `src/backend/services/CityStreetsService.js`.
- Ajouter ou adapter les tests `scoring_service`, `route_difficulty_easy`, `difficulty_consistency`.

### Une colonne en base

Ajouter un `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` à la fin de `SCHEMA_STATEMENTS` (`src/backend/config/database.js`) : il est exécuté à chaque démarrage et doit rester sans effet s'il a déjà été appliqué.

## Déboguer

### Côté serveur

- La première ligne du journal indique le mode de stockage : `PostgreSQL database tables verified.` ou `[db] ... mode local`.
- Les erreurs 500 sont toujours journalisées avec leur cause (`Controller method error: ...`).
- Pour reproduire sans toucher à ses données : `CITYMASTER_DATA_DIR=/tmp/cm-data CITYMASTER_STATE_DIR=/tmp/cm-state DB_DISABLED=true PORT=3999 npm start` (copier au préalable les fichiers de ville utiles dans `/tmp/cm-data`).
- Tester une route : `curl -H "Authorization: Bearer <jeton>" http://localhost:3000/api/...` (le jeton est dans `localStorage.token` du navigateur).

### Côté navigateur (DevTools)

- **Application → Local Storage** : session et partie en cours (`citymaster_session`). Supprimer cette clé débloque une partie corrompue.
- **Application → IndexedDB → citymaster_storage** : villes en cache (avec leur `etag`).
- **Application → Service Workers** : « Update on reload » pendant le développement, sinon un ancien code peut rester servi. Le cache s'appelle `citymaster-vNN`.
- **Réseau** : un `304` sur `/assets/data/<ville>.json` est normal (cache revalidé).

### Problèmes fréquents

| Symptôme | Cause probable |
|---|---|
| `FATAL ERROR: JWT_SECRET ...` au démarrage | `.env` absent ou incomplet (voir `.env.example`) |
| Salons en erreur 503 | Mode local : PostgreSQL injoignable ou `DB_DISABLED=true` |
| Les scores disparaissent au redémarrage | Mode local (scores en mémoire) |
| Tous les joueurs bloqués par la limite de connexion | Serveur derrière un proxy sans `TRUST_PROXY` |
| « Cette partie n'est plus valide » | Jeton de partie refusé (secret changé, mise à jour du serveur, partie d'un autre compte) : comportement normal, relancer une partie |
| Partie très lente sur une grande ville | Fichier de ville trop gros ou ancien : le supprimer de `public/assets/data/` pour qu'il soit régénéré |
| Ancienne version affichée après un déploiement | `CACHE_NAME` non incrémenté dans `public/sw.js` |

## Avant de terminer une modification

1. `npm run check` : 0 erreur de lint, tous les tests verts.
2. Tester à la main le parcours touché (`npm run dev`).
3. Incrémenter la version (`npm run version:bump -- patch|minor`) et rédiger l'entrée de `CHANGELOG.md` ; vérifier qu'elle est copiée dans `public/CHANGELOG.md`.
4. Relire `git diff` : pas de fichier de données, de `.env` ni de log de débogage.
