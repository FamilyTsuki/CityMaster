# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

## [1.5.7] - 2026-08-14

### Corrigé
- **Correction d'Affichage du Bandeau de Question sur Firefox Android / Mobile** :
  - **Ordre de Transition des Écrans** : Inversion de l'ordre d'appel lors du lancement de la partie (`showScreen('game')` appelé *avant* `loadNextQuestion()`), garantissant que la bannière de consigne (`#top-banner`) est affichée sur un écran déjà actif dans le DOM.
  - **Gestion de l'Opacité et Réinitialisation CSS** : Ajout du mode `animation-fill-mode: forwards` et d'une réinitialisation explicite de l'opacité et de la visibilité (`opacity: 1`, `visibility: visible`) sur le composant `#top-banner` et `#bottom-actions` pour éviter tout gel de l'animation CSS sur Firefox Android.

## [1.5.6] - 2026-08-14

### Amélioré
- **Modal de Confirmation Personnalisée (Remplacement de la Pop-up Navigateur)** :
  - **Suppression du `confirm()` Natif** : Remplacement de l'alerte navigateur `confirm()` par une fenêtre modale sur-mesure (`#room-confirm-modal`) intégrée au thème de l'application.
  - **Design Glassmorphe & Animation Fluid** : Fenêtre contextuelle avec arrière-plan flouté, titre « Réinitialiser le salon », message « Voulez-vous réinitialiser le salon et recommencer avec les mêmes rues ? » et deux boutons explicites « Annuler » et « Recommencer ».

## [1.5.5] - 2026-08-14

### Amélioré
- **Optimisation Mobile Responsive Complète** :
  - **Boutons d'Action des Salons (Room Results)** : Empilement vertical (`flex-direction: column; width: 100%`) des 4 boutons d'action sur mobile (`@media max-width: 640px`) pour empêcher tout débordement ou dépassement d'écran.
  - **Interface d'Édition Administrateur (Admin Panel)** : Layout hybride sur smartphone (`@media max-width: 768px`) avec la carte interactive Leaflet en haut (55vh) et le volet de configuration sous forme de panneau inférieur scrollable (45vh).
  - **Prise en Charge des Petits Écrans (< 400px)** : Marges et tailles de police adaptées sur très petits smartphones pour tous les formulaires, lobbies et tableaux de résultats.
  - **Alignement du Compteur de Joueurs** : Application du style Flexbox (`.players-header`) garantissant l'alignement sur la même ligne du titre « Joueurs Présents » et de la pastille du nombre de participants.

## [1.5.4] - 2026-08-14

### Corrigé
- **Correction d'une Erreur de Syntaxe JS (`SyntaxError`)** : Remplacement des appels résiduels `#stopPolling()` par la méthode publique `stopPolling()` dans les gestionnaires de retour arrière et d'accueil du contrôleur de salon, éliminant l'erreur console `Uncaught SyntaxError: Private field '#stopPolling' must be declared in an enclosing class`.

## [1.5.3] - 2026-08-14

### Ajouté
- **Option de Durée de Validité des Salons (24h par défaut)** :
  - **Choix de la Durée à la Création** : Sélection personnalisée de la durée de validité (1h, 24h ou 7 jours) sur le formulaire de création du salon.
  - **Gestion de l'Expiration en Base** : Ajout de la colonne `expires_at` dans PostgreSQL et blocage automatique des accès aux salons expirés (code HTTP 410).
  - **Affichage de l'Expiration dans le Lobby** : Information claire sur l'heure et la date limite de validité de la session.
- **Réinitialisation et Relance du Salon (Mêmes Rues)** :
  - **Bouton « Recommencer (Mêmes rues) »** : Option réservée au créateur du salon (ou administrateur) sur l'écran des résultats.
  - **Endpoint API `/api/rooms/:code/reset`** : Remise à zéro des scores et relance de la session avec le même ensemble de rues (`test_id`).

### Corrigé
- **Gestion des Salons & Flux de Jeu Multijoueur** :
  - **Déblocage des Nouveaux Participants** : Redirection automatique des joueurs n'ayant pas encore joué vers l'épreuve du salon, même si la session a été démarrée par d'autres.
  - **Consultation Directe des Résultats** : Les joueurs ayant déjà soumis leur score sont automatiquement orientés vers le tableau des résultats.
  - **Validation Automatique lors de l'Abandon** : Soumission automatique du score intermédiaire (`finished = true`) lors d'un clic sur « Quitter » ou « Accueil » pour éviter de bloquer le salon indéfiniment.
  - **Nettoyage du Polling en Arrière-Plan** : Interruption automatique du rafraîchissement lors de la navigation vers d'autres pages (Profil, Connexion, Accueil).
- **Accès Administrateur & Authentification** :
  - **Vérification Dynamique du Rôle Admin** : Contrôle direct en base de données dans `requireAdmin` et mise à jour dynamique du profil (`isAdmin`) sans obliger à se déconnecter.
- **Cartographie & Stabilité des Consignes (Prompts)** :
  - **Filtrage des Noms de Rues** : Exclusion stricte des éléments sans nom valide du tirage des questions.
  - **Valeur de Secours (`safeStreetName`)** : Garantie d'affichage d'une consigne complète sans variable vide.
- **Améliorations UI & Responsive** :
  - **Suppression du Décalage de Mise en Page (Zero Layout Shift)** : Réservation fixe de la hauteur des messages de confirmation de copie avec transition par opacité.
  - **Ajustement Mobile des Feedbacks de Copie** : Centrage et espacement adaptés sur mobile pour éviter le chevauchement avec les bordures.

