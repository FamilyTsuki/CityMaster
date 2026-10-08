# Changelog - CityMaster

Toutes les modifications majeures du projet CityMaster sont répertoriées ci-dessous par version.
Ce fichier est crée et acctualiser par ia.

## [2.5.2] - 2026-10-08

### Ergonomie, Taille & Haute Visibilité du Bouton Google Sign-In
- **Mise à l'Échelle & Alignement Réactif (`AuthView.js`)** :
  - Rehaussement de la taille du bouton Google Identity Services (`renderButton`) de `"medium"` (32px) vers `"large"` (40px), s'harmonisant avec la hauteur standardisée des champs de saisie et du bouton de soumission.
  - Calcul dynamique et adaptatif de la largeur (`width`) calé sur la largeur effective du conteneur parent (`clientWidth`, borné entre 200px et 400px), assurant un alignement parfait avec le formulaire sur desktop comme sur mobile.
  - Ajout d'un observateur de redimensionnement de fenêtre (`window.resize` avec debounce 150 ms) pour recalculer la largeur du bouton lors d'un changement de taille d'écran ou d'orientation mobile.
- **Haute Visibilité & Contraste Mode Sombre (`auth.css` & `AuthView.js`)** :
  - Abandon du thème `"filled_black"` (qui se fondait sans bordure dans l'arrière-plan de carte sombre `#1a1f2c`) au profit du thème officiel haute visibilité `"outline"` recommandé par les directives de style Google sur les arrière-plans sombres.
  - Retrait du forçage `color-scheme: light;` sur `.google-auth-container` pour respecter l'héritage du thème de l'application.
  - Stylisation avancée de l'iframe Google : coins arrondis (`border-radius: 8px`), ombre portée en mode sombre (`box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5)`), micro-liseré lumineux (`0 0 0 1px rgba(255, 255, 255, 0.18)`) et illumination au survol.
- **Cache & Cycle de Vie PWA** :
  - Incrémentation du cache Service Worker en `citymaster-v13` (`public/sw.js`) pour forcer le rafraîchissement des assets chez les clients.
  - Mise à jour des chaînes de cache-busting `?v=2.5.2` dans `public/index.html` et synchronisation du badge de version dans `README.md`.

---

## [2.5.1] - 2026-10-07

### Automatisation du Versioning & Directives de Release Agent
- **Automatisation Workspace (`GEMINI.md`, `AGENTS.md`, `.agents/rules/versioning.md`)** : Configuration des règles impératives guidant l'assistant IA pour imposer l'incrément SemVer systématique, la mise à jour des en-têtes d'assets (`public/index.html`, `public/sw.js`), la complétion du journal `CHANGELOG.md` et l'exécution des tests unitaires (`npm test`) à chaque intervention.
- **Script Automatisé d'Incrément (`scripts/bump-version.js` & `npm run version:bump`)** : Utilitaire Node.js permettant de mettre à jour de manière synchronisée et atomique `package.json`, le cache Service Worker (`public/sw.js`), les versions d'icônes/manifeste (`public/index.html`), le badge `README.md` et d'initialiser la section correspondante dans `CHANGELOG.md`.

---

## [2.5.0] - 2026-10-07

### Performance Réseau, Optimisations API & Architecture Sécurisée
- **Cache Local Haute Performance (IndexedDB & `StorageService`)** : Introduction de la persistance locale IndexedDB sans contrainte de quota de 5 Mo pour les fichiers GeoJSON de communes. Les parties rejouées démarrent instantanément (0 ms de latence réseau, 0 octet consommé).
- **Suppression du Cache-Busting & En-têtes HTTP de Longue Durée** : Retrait du paramètre systématique `?t=${Date.now()}` sur le chargement des communes et des fichiers de personnalisation. Configuration d'en-têtes HTTP `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` sur `/assets/data/*.json`.
- **Synchronisation Salons Temps Réel (Server-Sent Events & Polling Conditionnel ETag)** :
  - Endpoint persistant SSE `/api/rooms/:code/stream` pour la diffusion immédiate (< 50 ms) des événements de salon (connexion, démarrage, score, reset) sans polling continu.
  - Bascule transparente côté client vers un polling conditionnel léger : calcul d'un hash MD5 de l'état du salon renvoyant `{ changed: false }` (~30 octets) au lieu de répéter la charge utile complète toutes les 2 secondes.
  - Authentification JWT supportée via query string pour les flux `EventSource`.
- **Protection des Quotas & Caches Serveur OpenStreetMap** :
  - **Overpass LRU Cache** : Cache mémoire de 24h basé sur une empreinte SHA-256 des requêtes avec éviction LRU (max 200 entrées) pour soulager les serveurs publics OSM.
  - **Nominatim Server Cache** : Cache mémoire d'une heure sur les requêtes de géocodage évitant tout bannissement d'IP pour dépassement du quota de 1 req/sec.
  - **Mémoïsation Client** : Cache dictionnaire local (`Map`) sur les saisies d'autocomplétion des communes dans l'administration, la création de salons et le jeu.
- **Sécurisation & Cloisonnement Backend** :
  - Verrouillage de l'accès public au répertoire `/src/backend` dans `server.js`.
  - Migration sécurisée de `users.json` hors du dossier public statique vers `config/users.json`.
  - Élagage des erreurs 500 et suppression des logs d'authentification bloquants dans `/tmp`.
- **Refonte des I/O & Mémoire Serveur** :
  - Remplacement des lectures de fichiers bloquantes synchrones (`readFileSync`) par `fs/promises`.
  - Suppression de la lecture lourde des GeoJSON (347 Mo pour Lyon) dans le contrôleur de salons en exploitant les métadonnées légères de `City.getAll()`.
  - Mise en cache mémoire de la liste des communes avec invalidation dynamique.
  - Rehaussement du rate limiter global pour les connexions simultanées en réseau local.
- **Améliorations PWA & Expérience Hors-Ligne** :
  - Page de repli hors-ligne (`offline.html`) avec interface soignée et détection en temps réel du retour de la connectivité.
  - Bouton d'installation PWA contextuel dans la barre de navigation (`#pwa-install-btn`).
  - Cache Service Worker incrémenté en `citymaster-v12`.
- **Nettoyage "Clean Code" Intégral** :
  - Éradication de tous les imports inutilisés et variables mortes dans `RoomController`, `GameController`, `GameView`, `AdminController`, `scores.routes.js`, `User.js` et `RoomView`.
  - Factorisation de la navigation et harmonisation uniforme du style des chaînes (`'`).
- **Suite de Tests d'Intégration Étendue (24/24 tests validés)** :
  - Tests complets pour `AuthController` (politique de mot de passe, format des pseudos, validation JWT).
  - Tests complets pour `RoomController` (génération aléatoire cryptographique 6 caractères, PRNG mulberry32, expiration automatique 1h/24h/7j).
  - Tests complets pour `ScoreController` (déduplication MAX score, validation et rejet des scores invalides).

---

## [2.4.0] - 2026-10-07

### Authentification Google GIS, UX Salons & Architecture Modèle
- **Bouton Google Sign-In Dynamique & Thématique** : Intégration complète de Google Identity Services avec gestion réactive du mode sombre et clair via un `MutationObserver` (`theme: "filled_black"` en mode sombre, `theme: "outline"` avec bordure nette et texte foncé en mode clair).
- **Suppression des Conflits de Rendu Google** : Élimination du cadre blanc artificiel grâce à `color-scheme: light` et suppression des styles CSS intrusifs altérant l'aspect natif du composant Google.
- **Espacement & Ergonomie des Formulaires** : Ajustement des marges entre le bouton Google et le séparateur "OU / OR", élimination des chevauchements d'éléments sur mobile et bureau.
- **Feedback Immédiat de Recherche de Ville** : Affichage instantané dès la première frappe de l'animation à trois points pulsants (`.search-loader`) dans les barres de recherche de communes (Salons, Jeu et Administration) avec debounce optimisé à 400ms.
- **Feedback Visuel de Copie de Salon** : Animation et infobulle de confirmation (`.copy-feedback`) lors de la copie du code de salon ou du lien d'invitation (`.share-box`, `.code-box`).
- **Bouton d'Action Primaire dans les Salons** : Promotion du bouton "Rejoindre" en style primaire (`btn-primary`) pour maximiser la visibilité et l'ergonomie.
- **Modèle de Données City & Isolation Git** : Création du modèle asynchrone `City` (`City.getAll()`, `City.findBySlug()`) et déport des communes dynamiques dans `config/custom_cities.json` (ignoré par Git) afin d'éviter tout conflit de fusion (`git pull`) lors des déploiements.
- **Dédoublonnage & Mise en Valeur du Classement** : Agrégation stricte des scores par joueur via `MAX(score)`, mise en surbrillance de l'utilisateur actif (`.current-user-row`) et fiabilisation du stockage mémoire de secours.
- **Fluidité de Transition d'Écran** : Remplacement de la transformation résiduelle sur `.screen.active` par `transform: none` pour permettre au dégradé d'arrière-plan de s'étendre naturellement sous la barre de navigation transparente.
- **Balises Meta Theme-Color Dynamiques** : Synchronisation de la couleur de la barre d'état du navigateur mobile (`theme-color`) avec le mode clair/sombre.
- **Nettoyage et Standardisation de la Racine** : Suppression de tous les scripts de patch et fichiers temporaires à la racine du projet, et mise à jour stricte du fichier `.gitignore`.
- **Mise à Jour du Cache PWA** : Incrément de la version du Service Worker (`citymaster-v10`) et synchronisation cohérente du thème dans le `localStorage`.

---

## [2.3.0] - 2026-10-05

### Refonte Stylistique Neumorphique, Tokens CSS & Internationalisation Globale (i18n)
- **Éradication des Couleurs Brutes & Tokens Sémantiques** : Remplacement systématique de l'ensemble des couleurs hexadécimales par des variables CSS (`var(--color-...)`), introduction des teintes dérivées claires (`--color-danger-light`, `--color-success-light`, `--color-warning-light`, `--color-accent-light`) pour un contraste optimal en thème sombre et clair.
- **Harmonisation Neumorphique Globale** : Uniformisation des ombres portées, bordures et effets de relief (`box-shadow`, `inset`) sur l'ensemble des composants (boutons, cartes, badges, formulaires, messages flash, navigation et profil).
- **Généralisation de l'i18n sur Toutes les Vues** : Traduction intégrale (FR/EN) intégrée dans `AdminView`, `MapView`, `RoomView`, `GameView`, `CertificateView`, `AuthView` et `FlashMessageService`.
- **Attributs Placeholder Traduisibles** : Support dynamique de la traduction des placeholders de saisie via l'attribut `data-i18n-placeholder` dans `I18nService`.
- **Suite Complète de Tests Automatisés i18n (`tests/i18n.test.js`)** :
  - Vérification automatisée de la parité stricte clé par clé entre `fr.json` et `en.json`.
  - Contrôle systématique que tous les attributs `data-i18n*` des fichiers HTML existent dans les dictionnaires.
  - Détection automatique d'éventuelles clés orphelines ou manquantes appelées dans le code JavaScript (`t(...)`).
- **Responsive Layout & Grilles de Configuration** : Révision complète de la grille de sélection des paramètres de jeu (`setup.html` / `setup.css`) et adaptation tactile sur petits écrans.

---

## [2.2.0] - 2026-09-27

### Moteur de Difficulté des Voies, Couche API Centralisée & Sécurité Administrateur
- **Calcul Dynamique de la Difficulté des Voies (`RouteDifficultyService`)** : Algorithme d'analyse géographique basé sur la longueur cumulée et la typologie OpenStreetMap des voies (`primary`, `secondary`, `residential`, `living_street`, etc.) par rapport au centroïde de la commune pour classifier chaque voie en *Facile, Moyen ou Difficile*.
- **Surcharge des Difficultés dans l'Administration** : Interface et routes dédiées (`/api/admin/cities/:slug/difficulty`) permettant de personnaliser le niveau de difficulté attribué à chaque voie.
- **Centralisation des Requêtes HTTP (`ApiService`)** : Service unifié gérant les verbes HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), l'injection transparente du token JWT et la gestion centralisée des erreurs de session.
- **Renforcement de la Persistance Administrateur** : Middleware `requireAdmin` sécurisé avec vérification croisée du JWT et de la persistance en base PostgreSQL (`User.setAdminStatus`, `User.findByUsername`).
- **Script d'Attribution de Rôle (`scripts/make-admin.js`)** : Outil CLI pour attribuer les privilèges administrateur de manière sécurisée et scriptable.
- **Suite de Tests d'Intégration** : Validation automatisée de la persistance des droits administrateurs (`tests/admin_persistence.test.js`) avec le runner natif `node:test`.

---

## [2.1.0] - 2026-09-17

### Fusion des Tronçons de Voies & Cycle des Sessions de Jeu
- **Tests Automatisés de Fusion Spatiale (`tests/city_modifications.test.js`)** : Tests validant la fusion Turf.js des tronçons de rues OSM, la gestion des renommages, l'ajout de voies personnalisées et la suppression sans doublons.
- **Cycle de Vie et Sérialisation des Sessions (`GameSession.js`)** : Préservation du prompt courant et de l'index de manche lors des phases de feedback (`nextPrompt`), sérialisation rétrocompatible et tests unitaires (`tests/game_session.test.js`).
- **Refactoring & Optimisation de MapView** : Simplification des méthodes de rendu cartographique, suppression des redondances et meilleure gestion des couches de tracés.

---

## [2.0.0] - 2026-09-13

### Refonte Graphique Majeure, PWA & Support Bilingue (i18n)
- **Nouvelle Identité Visuelle Neumorphique** : Refonte stylistique complète avec tokens CSS unifiés, ombres douces, cartes flottantes et prise en charge native du thème sombre/clair.
- **Écran d'Authentification Interactif & Mascottes** : Introduction des mascottes vectorielles interactives (Kiko et le chat gris) dotées d'une animation physique de queue dynamique et réagissant aux interactions de l'utilisateur.
- **Internationalisation Initiale (i18n)** : Architecture bilingue français/anglais avec système de chargement dynamique des dictionnaires (`I18nService`), persistance du choix et bascule instantanée.
- **Application Web Progressive (PWA)** : Support hors-ligne via Service Worker, mise en cache des actifs statiques et dialogue d'installation sur mobile et bureau.
- **Refonte des Menus et Navigation** : Barre de navigation réactive (`NavbarView`) avec menu burger mobile, indicateur de version et actions contextuelles adaptées à l'état de connexion.

---

## [1.9.1] - 2026-08-28

### Ergonomie Administration & Inspection des Voies
- **Centrage et Surbrillance au Clic dans l'Admin** : Le clic sur un nom de rue ou de quartier dans les menus latéraux d'administration déplace et ajuste la caméra (`fitBounds`) directement sur le tracé de la voie et l'affiche avec une surbrillance colorée (`#f43f5e`, épaisseur 8px), sans ouvrir le mode d'édition de la géométrie.
- **Bouton Éditer Dédié** : Le mode d'édition avec poignées de sommet reste réservé exclusivement au clic explicite sur le bouton "Éditer".
- **Feedback Visuel de Sélection** : Ajout du style de sélection (`.route-list-item.selected`) mettant en évidence la ligne active dans le panneau latéral.

---

## [1.9.0] - 2026-08-28

### Salons Multijoueurs, Gestion Invités & Filtrage des Voies
- **Rejointure Invités sans Compte** : Écran dédié avec saisie du Pseudo et du Code de la Room pour les joueurs non connectés, avec lien secondaire vers la connexion.
- **Création de Salon Réservée** : Exigence d'un compte utilisateur enregistré pour la création de salon (contrôle frontend et rejet HTTP 403 backend).
- **Synchronisation de la Difficulté Multijoueur** : Prise en compte exacte de la difficulté sélectionnée par l'hôte (*Facile, Moyen, Difficile, Lotissements*) et mélange déterministe identique pour tous les participants.
- **Filtrage Strict des Voies Overpass** : Exclusion systématique des accès de service, sentiers et impasses privées (`highway=service|track|footway|path`), conservation exclusive des axes carrossables nommés.
- **Photos de Profil et Dédoublonnage** : Extraction et affichage dynamique des avatars des joueurs avec dédoublonnage strict par pseudo.
- **Fluidité Visuelle & Zéro Sursaut** : Empreinte mémoire (*signature*) empêchant le clignotement de la liste des joueurs pendant le rafraîchissement périodique (polling).
- **Actions Simplifiées sur l'Écran de Fin** : Boutons d'action épurés (*Recommencer la Room* réservé à l'hôte, *Quitter le Salon*, *Accueil*).
- **Responsivité Mobile & Safe-Area Padding** : Alignement flexbox vertical (`flex-direction: column; align-items: center`) avec prise en compte des encoches de smartphones (`env(safe-area-inset-top)`).

---

## [1.8.0] - 2026-08-27

### Cartographie, Validation Villes & Accessibilité RGAA
- **Système de Villes Validées Admin** : Bouton de validation coche verte (`✓ Ville validée`) dans l'onglet Routes Admin et affichage en vert (`#10b981`) avec badge `✓ Validée` dans tous les déroulants de sélection de communes.
- **Vue Satellite Unique** : Passage à 100% sur l'imagerie Esri World Imagery (Vue Satellite) par défaut partout (Jeu, Salons, Administration).
- **Conformité RGAA / WCAG 2.1 AA** : Ratios de contraste au survol (`:hover`) et focus réhaussés (> 6.8:1) en mode sombre.
- **Recherche Villes 100% Dynamique** : Géocodage Nominatim en temps réel sans saisie manuelle dans `cities.json` et filtrage strict des communes.
- **Suppression des Filigranes** : Élimination définitive des tuiles CARTO restreintes (`API KEY REQUIRED`).
- **Correction Couleurs Mode Sombre** : Suppression des filtres d'inversion pour conserver les couleurs réelles HD de l'imagerie satellite.

---

## [1.7.0] - 2026-08-26

### Ergonomie UI & Clean Code
- **Adaptation Thème Sombre & Clair** : Harmonisation CSS globale et basculement dynamique des tuiles de carte CARTO.
- **Boutons Propres & Navigation SPA** : Conversion des liens `<a>` en `<button>` sans aperçu d'URL `#` au survol.
- **Suppression des Popups Bloquants** : Remplacement des `alert()` et `confirm()` par des toasts et modales personnalisées.
- **Overpass API Dynamique** : Fallback universel en temps réel pour toutes les communes.
- **Refactoring Strict** : Code 100% sans commentaires, sans `innerHTML` et nommage en anglais.

---

## [1.6.0] - 2026-08-26

### Refactoring & Clean Code
- **Code Auto-Documenté** : Suppression intégrale de tous les commentaires dans le code source JavaScript.
- **Pattern MVC Strict** : Séparation totale entre la logique de contrôle et le rendu visuel. Rendu DOM déplacé vers `AdminView.js`.
- **Suppression du HTML et CSS Brut** : Remplacement des `innerHTML` et styles en ligne `style="..."` par la création d'éléments DOM natifs et de classes CSS.
- **Encapsulation et POO** : Utilisation systématique de champs privés (`#field`) et accesseurs explicites.
- **Stabilité de l'Administration** : Correctif de la persistance du rôle Administrateur lors du redémarrage du serveur et synchronisation avec PostgreSQL.

---

## [1.5.9] - 2026-08-15

### UI & Modales
- **Suppression des Alertes Natives** : Remplacement de l'ensemble des `alert()` du navigateur par des modales sur-mesure et notifications toast (`#admin-toast`).
- **Gestion des Salons Expirés** : Notification d'expiration fluide lors des fins de sessions multijoueur.

---

## [1.5.8] - 2026-08-14

### Ergonomie Mobile
- **Panneau Administrateur Responsive** : Ajustement plein écran du tableau de bord d'administration (`#admin-screen`).
- **Cartes et Diplômes** : Contraintes de largeur et adaptations tactiles sur smartphones.

---

## [1.5.7] - 2026-08-14

### Correctifs
- **Fix Affichage Firefox Android** : Correctif d'opacité et de visibilité sur les bannières d'action (`#top-banner`, `#bottom-actions`).

---

## [1.5.6] - 2026-08-14

### Interface Utilisateur
- **Modale de Confirmation** : Fenêtre modale glassmorphe (`#room-confirm-modal`) remplaçant les fenêtres `confirm()` du navigateur.

---

## [1.5.5] - 2026-08-14

### Responsive Multijoueur
- **Disposition Mobile des Salons** : Alignement vertical des boutons et ajustement du panneau d'administration en volet inférieur.

---

## [1.5.4] - 2026-08-14

### Correctifs
- **Correction JS** : Correction de l'appel à la méthode publique `stopPolling()` dans `RoomController.js`.

---

## [1.5.3] - 2026-08-14

### Multijoueur & Salons
- **Gestion de la Validité** : Option de sélection de durée d'expiration des salons (1h, 24h, 7 jours).
- **Relance des Salons** : Réinitialisation et relance d'une session avec la même série de rues (`test_id`).

---

## [1.5.2] - 2026-08-10

### Administration & Signalements
- **Module de Signalement** : Prise en charge des retours joueurs pour anomalies cartographiques.
- **Gestion des Communes** : Outils d'administration pour la gestion des découpages géographiques.

---

## [1.5.1] - 2026-08-05

### Correctifs & Thèmes
- **Gestion du Timer** : Harmonisation du décompte du temps et des points.
- **Thème Visuel** : Basculement fluide et mémorisation du mode sombre / clair.

---

## [1.5.0] - 2026-07-28

### Fonctionnalités Majeures
- **Mode Multijoueur** : Création de salons de jeu privés et classements en direct.
- **Connexion Google OAuth 2.0** : Authentification rapide et synchronisation du profil joueur.

---

## [1.4.0] - 2026-07-15

### Certificats & Classements
- **Certificat de Réussite** : Diplôme personnalisé avec effets de confettis et sonores.
- **Classements Généraux** : Palmarès mensuels et globaux par ville et difficulté.

---

## [1.3.0] - 2026-06-30

### Persistance & Backend
- **Base de Données PostgreSQL** : Gestion de la persistance des comptes, scores et salons.
- **Proxy Overpass API** : Serveur proxy avec basculement automatique (*failover*) multi-serveurs.

---

## [1.2.0] - 2026-06-10

### Administration & Multilingue
- **Panneau d'Édition** : Outils d'édition des itinéraires et quartiers sur carte Leaflet.
- **Support I18n** : Internationalisation complète en Français et Anglais.

---

## [1.1.0] - 2026-05-20

### Gameplay
- **Modes de Jeu Cartographiques** : Modes Trouver la rue, Nommer la rue et Quiz géométrique.
- **Effets Sonores** : Intégration du service audio (`AudioService`).

---

## [1.0.0] - 2026-05-01

### Lancement Initial
- **Version Initiale de CityMaster** : Application cartographique interactive basée sur Leaflet.js et OpenStreetMap.
