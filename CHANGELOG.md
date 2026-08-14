# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

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

