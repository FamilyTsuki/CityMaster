# Changelog

Toutes les modifications notables de cette session seront documentées dans ce fichier.

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
