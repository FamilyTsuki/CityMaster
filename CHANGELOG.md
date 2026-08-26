# Changelog - CityMaster

Toutes les modifications majeures du projet CityMaster sont répertoriées ci-dessous par version.

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
