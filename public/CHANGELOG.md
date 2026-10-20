# Journal des modifications (Changelog) - CityMaster

Toutes les modifications notables apportées au projet CityMaster sont documentées dans ce fichier.
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/).

## [2.16.20] - 2026-10-20

### Modifié
- Harmonisation des bordures, rayons et ombres des conteneurs de la page Support (suppression de la bordure en tirets et des bordures supérieures asymétriques).
- Alignement typographique des titres de la page Support sur la police de l'application (Lilita One).
- Intégration de la barre de navigation au thème chaud lors de l'affichage de l'écran de support.

---

## [2.16.19] - 2026-10-20

### Modifié
- Rectification de l'origine du projet sur la page Support : genèse créée pour aider les pompiers à mémoriser leur secteur tout en s'amusant.
- Révision de la description du soutien Ko-fi (don amical et libre, sans mention de coûts d'infrastructure ou de matériel).
- Synchronisation des dictionnaires de traduction français et anglais (`fr.json`, `en.json`).

---

## [2.16.18] - 2026-10-20

### Modifié
- Mise à jour des directives de versioning et conventions du projet (`AGENTS.md`, `GEMINI.md`, `.agents/rules/versioning.md`).
- Définition des règles strictes de rédaction du changelog (style sobre, standard Keep a Changelog, exclusion des formulations verbeuses).

---

## [2.16.17] - 2026-10-20

### Modifié
- Harmonisation et simplification du journal des modifications selon les conventions [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).
- Retrait des formulations superflues et normalisation technique des notes de version antérieures.
- Mise à jour du script d'incrément de version (`scripts/bump-version.js`).

---

## [2.16.16] - 2026-10-20

### Corrigé
- **Positionnement du header & marges des écrans** : Résolution du problème de chevauchement où le haut des pages passait sous la barre de navigation fixe.
- **Variables de mise en page réactives (`variables.css` & `navbar.css`)** : Introduction de `--screen-padding-top` et `--screen-padding-bottom` synchronisés dynamiquement avec la hauteur réelle et la position du header.
- **Uniformisation des vues** : Application des marges adaptatives sur l'Accueil, les Salons, la Configuration, l'Authentification, les Notes de version, les Mentions légales, le Profil, le Certificat et l'Administration.
- **Normalisation des fichiers de style** : Conversion des sauts de ligne au standard Unix LF.

---

## [2.16.15] - 2026-10-20

### Modifié
- **Boutons de contribution sur la page Support (`support.css`)** : Remplacement des dégradés saturés par un style sobre et net, aligné avec la charte graphique de l'application (couleur principale du jeu pour Ko-fi, teinte foncée contrastée pour la modération).
- **Internationalisation (`fr.json`, `en.json`)** : Clarification et simplification des libellés d'action pour la page Support (*« Soutenir sur Ko-fi »* et *« Rejoindre la modération »*).

---

## [2.16.14] - 2026-10-20

### Ajouté
- **Animation d'arrière-plan de la page Support (`support.css`)** : Ajout d'une animation d'ambiance avec sphères lumineuses ascendantes et flou diffus créant un effet chaleureux continu derrière les cartes.

---

## [2.16.13] - 2026-10-20

### Amélioré
- **Arrière-plan d'ambiance de la page Support** : Intégration des éléments flottants et ajustement des transitions lumineuses.

---

## [2.16.12] - 2026-10-20

### Amélioré
- **Intégration plein écran du header (`navbar.css`)** : Passage de la barre de navigation en positionnement fixe au-dessus du contenu, permettant à l'arrière-plan personnalisé de s'étendre sur toute la hauteur de la fenêtre sans rupture visuelle.

---

## [2.16.11] - 2026-10-20

### Amélioré
- **Habillage de la page Support (`support.css`)** :
  - Dégradés sombres aux nuances chaleureuses (tons café et ambre).
  - Typographie soignée avec police avec empattement (*Georgia*) pour les titres et contrastes optimisés pour la lecture.
  - Cartes aux angles arrondis avec effet verre dépoli (`backdrop-filter`).

---

## [2.16.10] - 2026-10-20

### Amélioré
- **Harmonisation visuelle de la page Support (`support.css`)** :
  - Déploiement de l'arrière-plan d'ambiance sur l'ensemble de la fenêtre via `#app-backdrop`.
  - Prise en charge des thèmes clair et sombre avec contrastes adaptés.

---

## [2.16.9] - 2026-10-20

### Modifié
- **Cohérence des styles de l'écran Support (`support.css`)** :
  - Utilisation des variables de thème globales (`--bg-card`, `--border-color`, `--text-main`).
  - Suppression des bordures superflues et intégration naturelle avec le reste de l'application.

---

## [2.16.7] - 2026-10-20

### Corrigé
- Résolution des problèmes de superposition et d'artéfacts sur l'animation GIF de la page Support (coalescence des frames).
- Mise à jour du cache Service Worker (`citymaster-v64`).

---

## [2.16.6] - 2026-10-20

### Amélioré
- Intégration inline en Base64 du GIF animé sur la page Support pour éliminer la requête réseau additionnelle.
- Mise à jour du cache Service Worker (`citymaster-v63`).

---

## [2.16.5] - 2026-10-20

### Modifié
- Simplification des textes de la page Support et retrait des sections intermédiaires d'infrastructure.
- Mise à jour du cache Service Worker (`citymaster-v62`).

---

## [2.16.4] - 2026-10-20

### Modifié
- Intégration du GIF animé de la mascotte sur la page Support et suppression de l'effet de zoom au survol.
- Mise en cache hors-ligne de la mascotte (`citymaster-v61`).

---

## [2.16.3] - 2026-10-20

### Modifié
- Restructuration du conteneur de la page Support pour poser directement les cartes sur l'arrière-plan d'ambiance.
- Mise à jour du cache Service Worker (`citymaster-v60`).

---

## [2.16.2] - 2026-10-20

### Modifié
- Allègement de l'écran Support : suppression de la barre de liens secondaires et du bouton de retour redondant.
- Mise à jour du cache Service Worker (`citymaster-v59`).

---

## [2.16.1] - 2026-10-20

### Ajouté
- Habillage graphique chaleureux pour la page Support (palette ambrée et typographie sérif).
- Options de contribution : don Ko-fi et candidature à la modération cartographique.
- Mise à jour du cache Service Worker (`citymaster-v58`).

---

## [2.16.0] - 2026-10-20

### Ajouté
- Nouvelle page « Soutenir le projet » accessible depuis le pied de page (`/support`).
- Bouton de contribution Ko-fi et options de participation au projet.
- Prise en charge multilingue (français / anglais) et mise en cache hors-ligne (`citymaster-v57`).

### Tests
- Tests unitaires pour la route et les composants de la page Support (`tests/support_route.test.js`).

---

## [2.15.3] - 2026-10-20

### Tests
- Refactoring et optimisation de la suite de tests unitaires pour une meilleure maintenabilité.

---

## [2.15.2] - 2026-10-20

### Corrigé
- Assainissement géométrique des voies OSM : suppression des boucles fermées parasites sur les voies linéaires.
- Préservation des véritables carrefours giratoires et ronds-points (`isRoundaboutFeature`).
- Découpage automatique des sauts anormaux (> 1200 m) entre coordonnées consécutives d'une même voie.

### Tests
- Tests unitaires d'assainissement géométrique des rues (`tests/street_stitching_and_haptics.test.js`).

---

## [2.15.1] - 2026-10-20

### Corrigé
- Décalage dynamique du bandeau de jeu supérieur lorsque la bannière hors-ligne est affichée pour éviter les chevauchements.
- Repositionnement des contrôles de zoom Leaflet au-dessus de la barre d'action inférieure.

### Tests
- Tests unitaires pour l'espacement adaptatif de la bannière hors-ligne (`tests/offline_sync.test.js`).

---

## [2.15.0] - 2026-10-19

### Ajouté
- Fusion automatique des tronçons contigus d'une même artère (Street Stitching) avec protection contre les homonymes distants.
- Retour haptique (vibrations) sur mobile lors des sélections et validations de jeu (`HapticService`).

### Tests
- Tests unitaires pour la fusion toponymique et le retour haptique (`tests/street_stitching_and_haptics.test.js`).

---

## [2.14.3] - 2026-10-19

### Corrigé
- Filtrage des micro-segments de voies OSM (< 15 mètres) pour éviter les voies non cliquables ou imperceptibles sur la carte.
- Ajout du calcul métrique de distance via `RouteDifficultyService.getFeatureLengthMeters`.

### Tests
- Tests unitaires pour le filtrage des micro-voies (`tests/micro_streets_filter.test.js`).

---

## [2.14.2] - 2026-10-19

### Amélioré
- Mécanisme de nouvelle tentative automatique en cas d'erreur de chargement de tuile cartographique (`tileerror`).
- Agrandissement du tampon de tuiles (`keepBuffer: 8`) et invalidation automatique de la taille de carte lors des redimensionnements.
- Mise en cache Service Worker des tuiles CartoDB et ArcGIS.

### Tests
- Tests unitaires pour la résilience du chargement des tuiles (`tests/map_tile_reliability.test.js`).

---

## [2.14.1] - 2026-10-19

### Corrigé
- Rééquilibrage du mode facile : exclusion des ruelles courtes de centre-ville et priorisation des grands axes toponymiques (boulevards, avenues, quais).

### Tests
- Tests unitaires pour la classification de difficulté des rues (`tests/route_difficulty_easy.test.js`).

---

## [2.14.0] - 2026-10-19

### Ajouté
- Célébration adaptative de fin de partie : volume de confettis modulé selon le score obtenu (Bronze, Argent, Or, Légendaire).
- Désactivation des confettis en cas de score insuffisant pour éviter les fausses célébrations.

### Tests
- Tests unitaires pour le calcul des paliers de confettis (`tests/confetti_score.test.js`).

---

## [2.13.1] - 2026-10-19

### Amélioré
- Déplacement adaptatif du sélecteur de thème dans le menu burger sur mobile pour libérer de l'espace dans la barre de navigation.

### Tests
- Tests unitaires pour l'affichage responsive de la barre de navigation (`tests/navbar_responsive.test.js`).

---

## [2.13.0] - 2026-10-19

### Ajouté
- Paramètre d'administration pour autoriser ou désactiver les places et squares dans les parties.
- Filtrage des places dans la sélection des rues et affichage d'un badge dédié dans l'administration.

### Tests
- Tests unitaires pour le filtrage et la configuration des places (`tests/places_setting.test.js`).

---

## [2.12.1] - 2026-10-19

### Amélioré
- Élimination du flash de contenu non traduit (FOUC) au chargement de l'application grâce à la détection précoce de langue.
- Pré-traduction des gabarits HTML avant insertion dans le DOM.

### Tests
- Tests unitaires pour le mécanisme anti-FOUC et la traduction synchrone.

---

## [2.12.0] - 2026-10-19

### Ajouté
- Sauvegarde locale automatique des villes jouées dans IndexedDB (`StorageService`).
- Moteur de jeu autonome permettant de jouer hors-ligne sur les villes en cache.
- Badge hors-ligne dans la recherche de villes et mention dédiée sur le certificat de fin de partie.

### Tests
- Tests unitaires pour le jeu et le stockage hors-ligne.

---

## [2.11.0] - 2026-10-19

### Ajouté
- Détection de l'état de connexion et bannière d'information hors-ligne (`NetworkService`).
- Mise en cache Service Worker des tuiles OpenStreetMap consultées.
- File d'attente locale pour la synchronisation différée des scores hors-ligne.

### Corrigé
- Gestion explicite des erreurs 503 dans le Service Worker au lieu d'un statut 200 en cas de perte de réseau.
- Reconnexion automatique au flux SSE et retry sur la soumission des salons multijoueurs.

### Tests
- Tests unitaires pour la résilience réseau et le mode hors-ligne (`tests/offline_sync.test.js`).

---

## [2.10.2] - 2026-10-19

### Modifié
- Nettoyage et suppression des fichiers de suivi des tâches achevées (`TODO_API_OPTIMIZATION.md` et `TODO_CODE_IMPROVEMENTS.md`).

---

## [2.10.1] - 2026-10-19

### Amélioré
- Ajustement des bulles d'ambiance en bas d'écran (`landing.css`) et correction de la hauteur minimale sur mobile (`100dvh`).

---

## [2.10.0] - 2026-10-19

### Ajouté
- Écran dédié au journal des modifications (`/changelog`) accessible via le badge de version dans la barre de navigation.
- Parser Markdown client pour l'affichage des notes de version (`ChangelogView.js`).
- Route API serveur `GET /api/changelog` et fallback hors-ligne PWA.

### Tests
- Tests unitaires pour la route du journal des modifications (`tests/changelog_route.test.js`).

---

## [2.9.1] - 2026-10-19

### Amélioré
- Arrière-plan d'ambiance global (`#app-backdrop`) étendu à l'ensemble des pages de l'application.
- Intégration du bouton de retour circulaire standardisé sur les pages d'authentification et de mentions légales.

---

## [2.9.0] - 2026-10-19

### Ajouté
- Palette adaptative des bulles d'ambiance selon le thème actif (teintes ambrées en sombre, bleutées en clair).
- Traduction complète de la modale d'installation PWA et synchronisation multilingue du sélecteur de thème.

---

## [2.8.20] - 2026-10-15

### Ajouté
- Bouton d'installation PWA dans la barre de navigation et le menu mobile.

### Corrigé
- Correction du contraste du bouton d'installation en mode clair.

---

## [2.8.19] - 2026-10-14

### Amélioré
- Ajustement de l'échelle et de la position du globe terrestre sur l'écran de chargement.

---

## [2.8.18] - 2026-10-13

### Amélioré
- Intégration de l'illustration du globe terrestre (`earth.png`) et lissage des contours sur l'écran de chargement.

---

## [2.8.17] - 2026-10-13

### Amélioré
- Ajustement de la ligne d'horizon terrestre sur l'écran de chargement et retrait des masques de découpe superflus.

---

## [2.8.16] - 2026-10-13

### Amélioré
- Harmonisation de la grille céleste et répartition des étoiles sur l'écran de chargement.

---

## [2.8.15] - 2026-10-13

### Corrigé
- Espacement vertical entre le texte et les monuments sur l'écran de chargement.
- Extension de l'horizon terrestre pour couvrir toute la largeur d'écran.

---

## [2.8.14] - 2026-10-13

### Amélioré
- Adoucissement de la trajectoire de vol et inclinaison dynamique de l'avion sur l'écran de chargement.

---

## [2.8.13] - 2026-10-13

### Amélioré
- Affichage plein écran de la scène de vol et alignement de la courbure terrestre avec la trajectoire.

---

## [2.8.12] - 2026-10-13

### Amélioré
- Détourage et intégration panoramique du globe terrestre le long de l'horizon.

---

## [2.8.11] - 2026-10-13

### Ajouté
- Illustration du globe terrestre avec halo atmosphérique et mise en cache hors-ligne (`earth.png`).

---

## [2.8.10] - 2026-10-13

### Ajouté
- Ambiance visuelle inspirée de Peek pour l'écran de chargement : grille céleste, double tracé de trajectoire et nuage cumulus d'arrivée.

---

## [2.8.9] - 2026-10-13

### Amélioré
- Animation d'apparition des monuments au-dessus de la trajectoire de vol.

---

## [2.8.8] - 2026-10-13

### Amélioré
- Apparition différée du point d'interrogation après l'entrée de l'avion dans le nuage.
- Stabilisation de l'affichage du nuage de destination.

---

## [2.8.7] - 2026-10-13

### Amélioré
- Animation de transition vaporeuse pour l'apparition du nuage de destination.
- Retrait des traits de repère orphelins sous les monuments.

---

## [2.8.6] - 2026-10-13

### Amélioré
- Apparition progressive du nuage de destination à mi-parcours (50%).
- Réduction de la taille du nuage et orientation dynamique le long de la courbe de descente.

---

## [2.8.5] - 2026-10-13

### Modifié
- Remplacement de la séquence de crash au sol par l'entrée de l'avion dans le nuage mystère.
- Inclinaison dynamique des monuments selon la pente locale de la trajectoire.

---

## [2.8.4] - 2026-10-13

### Ajouté
- Intégration des icônes de monuments réels (Arc de Triomphe, Louvre, Tour Eiffel) le long du vol.

---

## [2.8.3] - 2026-10-13

### Amélioré
- Orientation continue de l'avion le long de la pente de la trajectoire.
- Nettoyage des contrôles de test temporaires de l'écran de chargement.

---

## [2.8.2] - 2026-10-13

### Amélioré
- Épuration graphique de l'écran de chargement : typographie allégée, silhouette d'aéronef modernisée et capsules de monuments en verre dépoli.

---

## [2.8.1] - 2026-10-13

### Ajouté
- Trajectoire de vol en courbe parabolique Bézier avec calcul du tangage en temps réel.
- Apparition séquentielle des monuments au franchissement de chaque étape.

---

## [2.8.0] - 2026-10-13

### Ajouté
- Nouveau composant de chargement de vol interactif (`FlightLoader`).
- Animation d'avion avec progression, étapes de monuments et arrivée mystère.
- Prise en charge multilingue (français / anglais) et mise en cache hors-ligne (`citymaster-v18`).

### Tests
- Tests unitaires pour la logique et le cycle de vie du composant de vol (`tests/load_route.test.js`).

---

## [2.7.1] - 2026-10-13

### Corrections de bugs & Affichage
- **Positionnement et visibilité de l'écran de chargement (`loaders.css`, `landing.css`)** :
  - Résolution du problème d'écran blanc où `#load-screen` était repoussé 500 px sous la ligne de flottaison à cause de l'héritage `position: relative` cumulé avec `#landing-screen`.
  - Application stricte de `position: absolute !important; inset: 0 !important; z-index: 100 !important;` sur `.load-screen` pour garantir un affichage plein écran parfaitement centré au premier plan.
  - Masquage explicite (`display: none !important;`) des écrans inactifs tels que `#landing-screen:not(.active)` pour éviter qu'ils n'occupent de la hauteur dans le flux vertical.
- **Routage et tolérance d'URL (`Router.js`)** :
  - Prise en charge universelle des hash routes : `#load`, `#/load`, `#/load/` sont désormais résolues automatiquement vers `/load`.
  - Sécurisation de l'initialisation de l'application dans `app.js` avec vérification de `document.readyState` pour déclencher immédiatement `startApp` si le DOM est déjà chargé.

### Cache & Cycle de vie
- Incrémentation du cache Service Worker en `citymaster-v17` dans `public/sw.js`.
- Synchronisation des chaînes de cache-busting `?v=2.7.1` dans `public/index.html` et mise à jour du badge `README.md`.

---

## [2.7.0] - 2026-10-13

### Nouveautés & Nouvelles fonctionnalités
- **Création de la page et route dédiée `/load` (`public/screens/load.html`, `src/app.js`, `src/views/GameView.js`)** :
  - Mise en place d'un écran de chargement dédié et isolé (`#load-screen`), conçu pour permettre le redesign et la mise au point visuelle du composant de chargement sans fermeture automatique.
  - Enregistrement de la route `/load` (et `/#/load`) au sein du routeur frontend SPA.
  - Accès strictement réservé par URL directe : aucun lien de navigation, menu burger ou bouton dans l'interface ne pointe vers cette route.
  - Masquage automatique de la barre de navigation principale (`#main-nav`) lors de l'accès à `/load` pour offrir une vue plein écran 100% consacrée au chargement, et restauration immédiate de la barre lors du retour sur toute autre route.

### Optimisations & Architecture
- **Robustesse du routeur (`src/Router.js`)** :
  - Normalisation des chemins avec tolérance pour les slashes finaux (ex: `/load/` pris en charge de manière identique à `/load`).
  - Sécurisation des accès aux variables globales navigateur (`window`, `document`, `history`) avec des gardes `typeof` pour garantir une compatibilité totale dans les environnements de tests Node.js et SSR.
- **Stylisation dédiée (`public/assets/styles/components/loaders.css`)** :
  - Ajout des règles CSS pour `.load-screen` et `.loading-message` avec centrage complet dans la fenêtre d'affichage (100dvh) et support fluide des modes clair et sombre.

### Tests unitaires & Non-régression
- **Suite de tests pour la route `/load` (`tests/load_route.test.js`)** :
  - Validation de l'existence et du balisage du template `load.html` (`#load-screen`, `.loader-container`, `.loader-spinner`, `#load-page-message`).
  - Test du déclenchement du gestionnaire de route sur `/load` et `/load/`.
  - Contrôle d'absence de liens publics résiduels vers `/load` dans `index.html` et les écrans existants.
- **Validation globale** : 30 tests unitaires validés avec succès (30/30).

### Cache & Cycle de vie
- Ajout de `/screens/load.html` dans les assets statiques mis en cache par le Service Worker.
- Incrémentation du cache Service Worker en `citymaster-v16` dans `public/sw.js`.
- Mise à jour des chaînes de cache-busting `?v=2.7.0` dans `public/index.html` et synchronisation du badge de version dans `README.md`.

---

## [2.6.0] - 2026-10-11

### Nouveautés & Ergonomie
- **Support complet des tronçons multiples (MultiLineString) dans l'édition cartographique (`AdminView.js`, `AdminController.js`)** :
  - Résolution définitive du problème de tracé sur les rues fractionnées en plusieurs segments disjoints (ex: *Avenue de Paris* / RD 2020) où les tronçons étaient auparavant aplatis en une seule ligne continue, créant des diagonales géantes à travers toute la ville.
  - L'éditeur gère désormais nativement des tableaux de segments indépendants (`#activeRouteSegments`). Chaque tronçon est représenté distinctement sur la carte sans liaison intempestive.
  - Ajout d'un bouton d'action « + Ajouter un tronçon » permettant d'étendre une rue avec des segments disjoints supplémentaires.
  - Sauvegarde et persistance au format standard GeoJSON `MultiLineString` (ou `LineString` si tronçon unique).
- **Gestion de la visibilité des noms de rues lors de l'édition (`admin.css`, `AdminView.js`, `AdminController.js`)** :
  - Amélioration de l'ergonomie des étiquettes permanentes de rues (`.route-tooltip`), qui masquaient le tracé et les poignées de manipulation sur les petites rues denses (ex: *Rue de l'Écureuil du Bois-Bourru*).
  - Ajout d'un bouton flottant d'action sur la carte permettant de masquer ou réafficher toutes les étiquettes de rues en un clic (`toggleRouteLabels()`).
  - En mode édition active, l'étiquette de la rue en cours d'édition est automatiquement masquée pour dégager la vue, et les autres étiquettes s'estompent à 35% d'opacité avec `pointer-events: none` pour ne pas gêner les clics.
- **Accès direct au mode clair / sombre sur smartphone (`index.html`, `navbar.css`, `NavbarView.js`)** :
  - Déplacement du bouton de bascule de thème dans la barre supérieure visible en permanence (`.navbar-header-actions`), à côté du bouton de menu burger, permettant aux utilisateurs mobiles (notamment ceux dont le téléphone est configuré en mode sombre par défaut) de passer en mode clair en 1 seul tap.
  - Ajout d'un bouton explicite avec texte dynamique (« Mode clair » / « Mode sombre ») dans le tiroir du menu mobile pour une clarté totale.
- **Guide d'installation cross-plateforme et démystification du terme PWA (`index.html`, `style.css`, `landing.html`, `fr.json`, `en.json`)** :
  - Remplacement du jargon technique « PWA » par des explications claires et directes : « application installable sans passer par les stores ».
  - Ajout d'une modale d'aide interactive (`#install-modal`) détaillant les étapes pas-à-pas pour iPhone / iPad (Safari : Partager ⎋ > Sur l'écran d'accueil 📲), Android (Chrome : Menu ⋮ > Installer l'application) et Ordinateur.
  - Intégration d'un bouton d'accès au guide sur la page d'accueil dans la section Multi-Plateforme.

### Corrections de bugs & Refactoring
- **Filtrage de difficulté solo (`GameController.js`)** : Priorisation des rues correspondant exactement à la difficulté demandée en mode solo avant de compléter avec les rues de secours, alignant le comportement solo sur les salons multijoueurs.
- **Nettoyage du balisage HTML (`index.html`)** : Suppression de blocs scripts redondants avant la modale d'installation.

### Tests unitaires & Non-régression
- **Nouveau test MultiLineString (`tests/city_modifications.test.js`)** : Validation de la persistance et de l'intégrité des géométries `MultiLineString` dans `AdminController.saveRoute`.
- **Validation i18n** : Maintien de la parité stricte des dictionnaires i18n (`fr.json` et `en.json`) pour les nouvelles clés.
- **Suite de tests** : 27 tests validés avec succès (27/27).

### Cache & Cycle de vie
- Incrémentation du cache Service Worker en `citymaster-v15` dans `public/sw.js`.
- Mise à jour des chaînes de cache-busting `?v=2.6.0` dans `public/index.html` et synchronisation du badge de version dans `README.md`.

---

## [2.5.3] - 2026-10-11

### Corrections de bugs & Prise en compte de la difficulté des routes dans le jeu
- **Prise en compte des surcharges de difficulté en jeu (`GameController.js`)** :
  - Intégration de `readDifficultyOverridesFile(cityKey)` au sein de `GameController.startGame` afin de charger les modifications manuelles de difficulté (table PostgreSQL `route_difficulties` et fichier `difficulty_overrides.json`).
  - Priorisation de la difficulté manuelle (`difficultyOverrides[nameLower]`, `difficultyOverrides[origNameLower]` ou `feature.properties.difficulty`) sur le calcul automatique géométrique/toponymique OSM dans la fonction `getStreetDifficulty`.
  - Préservation stricte de la surcharge manuelle lors de la déduplication et de l'agrégation des tronçons de rue (`uniqueStreetsMap`).
- **Synchronisation frontend & panneau d'administration (`AdminController.js`, `RouteDifficultyService.js`, `CityController.js`)** :
  - Correction de la résolution de difficulté dans l'administration pour inspecter `originalName` et la propriété `feature.properties.difficulty` des routes personnalisées.
  - Synchronisation de `CityController.getDifficulties` avec prise en charge du nom d'origine des routes renommées pour le comptage des difficultés disponibles.
  - Prise en compte de `props.difficulty` dans `RouteDifficultyService.getRouteDifficulty`.
- **Tests unitaires & Non-régression** :
  - Ajout d'un test validant la prise en compte immédiate d'une surcharge de difficulté dans une session de jeu générée par `GameController.startGame`.
  - Ajout d'un test validant `RouteDifficultyService.getRouteDifficulty` avec `feature.properties.difficulty`.
  - Suite de tests passée à 26 tests (26/26 validés).
- **Cycle de vie & Cache PWA** :
  - Incrémentation du cache Service Worker en `citymaster-v14` (`public/sw.js`).
  - Synchronisation des chaînes de cache-busting `?v=2.5.3` dans `public/index.html` et du badge de version dans `README.md`.

---

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

### Automatisation du Versioning & Conventions de Release
- **Directives & Conventions du Projet (`AGENTS.md`, `.agents/rules/versioning.md`)** : Mise en place des règles de gouvernance du code : respect strict de SemVer, synchronisation des en-têtes d'assets (`public/index.html`, `public/sw.js`), journalisation dans `CHANGELOG.md` et validation systématique de la suite de tests (`npm test`).
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
- **Nettoyage du code** :
  - Suppression des imports inutilisés et variables mortes dans `RoomController`, `GameController`, `GameView`, `AdminController`, `scores.routes.js`, `User.js` et `RoomView`.
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
- **Tokens Sémantiques CSS** : Remplacement de l'ensemble des couleurs hexadécimales par des variables CSS (`var(--color-...)`), introduction des teintes dérivées claires (`--color-danger-light`, `--color-success-light`, `--color-warning-light`, `--color-accent-light`) pour un contraste optimal en thème sombre et clair.
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
