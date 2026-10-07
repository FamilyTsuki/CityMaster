# Changelog - CityMaster

Toutes les modifications majeures du projet CityMaster sont répertoriées ci-dessous par version.

## [2.1.1] - 2026-10-07

### Authentification Google, Stabilité UI & Nettoyage Projet
- **Bouton Google Sign-In Dynamique & Thématique** : Prise en charge réactive du mode sombre et clair via un `MutationObserver` (`theme: "filled_black"` en mode sombre, `theme: "outline"` avec bordure nette et texte foncé en mode clair).
- **Suppression des Conflits de Rendu Google** : Élimination du cadre blanc artificiel grâce à `color-scheme: light` et suppression des règles CSS intrusives qui retiraient les bordures et l'arrière-plan du bouton.
- **Espacement et Superposition Corrigés** : Ajustement des marges entre le bouton Google et le séparateur "OU / OR" sur mobile et desktop pour éliminer tout chevauchement.
- **Feedback Immédiat de Recherche de Ville** : Affichage instantané dès la saisie de l'animation à trois points pulsants (`.search-loader`) dans les barres de recherche de communes (Salons, Jeu et Administration).
- **Prévention des Conflits Git sur les Communes** : Séparation des communes ajoutées dynamiquement dans `config/custom_cities.json` (ignoré par Git) pour éviter les erreurs de fusion lors des `git pull` sur les serveurs de production.
- **Fiabilisation du Classement (Leaderboard)** : Regroupement strict des scores par joueur (`MAX(score)`), mise en avant visuelle de l'utilisateur actif (`.current-user-row`) et correction du fallback mémoire.
- **Fluidité du Fond d'Écran d'Authentification** : Suppression du `transform` résiduel sur `.screen.active` permettant au dégradé d'arrière-plan de s'étendre naturellement sous la barre de navigation transparente.
- **Nettoyage et Standardisation de la Racine** : Suppression de tous les scripts de patch et fichiers temporaires à la racine du projet, et correction de `.gitignore`.
- **Mise à Jour du Cache PWA** : Incrément de la version du Service Worker (`citymaster-v10`) et synchronisation cohérente du thème dans le `localStorage`.

---

## [2.1.0] - 2026-09-17

### Architecture API, Difficulté des Voies & Automatisation des Tests
- **Gestion Dynamique des Difficultés de Voies** : Implémentation du service `RouteDifficultyService` analysant automatiquement la longueur et la typologie des voies OSM pour proposer les niveaux adaptés (*Facile, Moyen, Difficile*).
- **Centralisation des Appels avec ApiService** : Unification des requêtes HTTP (authentification, headers, injection automatique du token JWT et gestion centralisée des erreurs de session).
- **Suite Complète de Tests Unitaires & d'Intégration** : Intégration de tests avec le runner natif `node:test` couvrant la fusion des routes, le cycle de vie des sessions de jeu, la persistance des droits administrateurs et la parité des dictionnaires i18n.
- **Sécurisation & Persistance des Rôles Admin** : Middleware `requireAdmin` renforcé et synchronisation robuste avec la table PostgreSQL.

---

## [2.0.0] - 2026-09-13

### Refonte Graphique, PWA & Support Bilingue (i18n)
- **Nouvelle Identité Visuelle Neumorphique** : Refonte stylistique complète avec tokens CSS unifiés, ombres douces, cartes flottantes et prise en charge native du thème sombre/clair.
- **Écran d'Authentification Interactif & Mascottes** : Introduction des mascottes vectorielles interactives (Kiko et le chat gris) dotées d'une animation physique de queue dynamique et réagissant aux interactions de l'utilisateur.
- **Internationalisation Complète (i18n)** : Prise en charge native du français et de l'anglais avec système de traduction dynamique (`I18nService`), persistance du choix et bascule instantanée.
- **Application Web Progressive (PWA)** : Support hors-ligne complet via Service Worker, mise en cache des actifs statiques et dialogue d'installation sur mobile et bureau.
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
