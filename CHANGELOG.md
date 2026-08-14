# Changelog

Toutes les modifications notables de cette session seront documentées dans ce fichier.

## [1.5.1] - 2026-08-14

### Corrigé
- **Gestion des Salons Multijoueurs (Room Controller & Game Controller)** :
  - **Rafraîchissement Continu du Classement** : Maintien du rafraîchissement automatique en arrière-plan (`polling`) sur l'écran des résultats pour les joueurs ayant terminé leur partie tant que le salon est actif.
  - **Déblocage de la Ré-actualisation** : Réinitialisation propre du drapeau de transition (`isTransitioning`) autorisant l'actualisation manuelle ou automatique des scores.
  - **Validation de la Fin de Partie en cas d'Abandon** : Soumission automatique du score intermédiaire et du statut `finished: true` lorsqu'un joueur clique sur « Quitter » ou « Accueil » pendant une partie multijoueur. Résolution du problème des participants bloqués indéfiniment au statut « En cours... » et fermeture automatique du salon lorsque tous les joueurs ont fini.
  - **Navigation depuis les Résultats** : Ajout du bouton « Quitter le Salon » sur la vue des résultats finalisés pour permettre aux joueurs de revenir à la gestion des salons.
- **Sauvegarde des Scores de Compétition** :
  - Transmission explicite du paramètre `testNumber` à `Score.create()` dans le backend afin d'enregistrer les scores avec leur `test_id` correspondant.
- **Validation du Formulaire Invité** :
  - Alignement des règles d'attributs `minlength="3"` et `maxlength="20"` pour le champ pseudonyme invité (`room-guest-username`) sur l'écran du salon avec la validation backend.

## [1.5.0] - 2026-08-13

### Ajouté
- **Exclusion Stricte des Voies Secondaires du Mode Facile** : Implémentation d'un filtre d'exclusion sémantique systématique sur les mots-clés de voies secondaires (`chemin`, `sentier`, `ruelle`, `passage`, `allée`, `impasse`, `traverse`, `square`, `villa`, `cité`). Aucune voie contenant ces termes ne peut désormais être classée en "Facile", quelle que soit sa longueur (résolvant le problème des longs chemins vicinaux > 800m proposés par erreur aux joueurs en mode Facile).

### Modifié
- **Correction et Robustesse de la Connexion Google Auth** :
  * Chargement prioritaire des variables d'environnement (`import 'dotenv/config'`) avant l'évaluation des modules backend ES.
  * Instanciation à la demande (`lazy-loading`) du client `OAuth2Client`.
  * Gestion de l'attente du chargement asynchrone du SDK Google (`window.google.accounts.id`) sur le client avant le rendu du bouton de connexion.
- **Support CSS et Métadonnées Theme Color / Color Scheme** : Déclaration de `<meta name="color-scheme" content="light dark" />` et des propriétés CSS `color-scheme: light;` / `color-scheme: dark;` pour éviter le conflit d'inversion automatique des couleurs causé par la fonctionnalité "Force Dark Pages" d'Opera et des navigateurs Chromium.
- **Refonte de la Page Profil** :
  * Correction du problème d'avatar ovale : application des règles `aspect-ratio: 1 / 1;`, `flex-shrink: 0;` et `object-fit: cover;` pour garantir une photo de profil strictement circulaire en toutes circonstances.
  * Réorganisation du header de profil en colonne avec centrage parfait du nom d'utilisateur sous l'avatar et positionnement absolu du bouton de retour circulaire `.btn-back-round`.
- **Sécurisation des Requêtes Administrateur** : Blocage du déclenchement automatique des requêtes `/api/admin/*` au démarrage de l'application. Seuls les utilisateurs authentifiés administrateurs (`is_admin === 'true'`) naviguant sur l'espace d'administration déclenchent les appels réseau, éliminant les erreurs `401 Unauthorized` dans la console des visiteurs.
