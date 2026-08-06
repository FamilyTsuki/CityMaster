# Changelog

Toutes les modifications notables de cette session seront documentées dans ce fichier.

## [1.4.0] - 2026-08-06

### Ajouté
- **Système de Salons Multijoueurs (Lobby)** : Possibilité de créer ou de rejoindre des salons de jeu multijoueurs (polling dynamique toutes les 2 secondes pour synchroniser les participants connectés et invités).
- **Connexion Rapide Invité** : Endpoint `/api/auth/guest` permettant de rejoindre un salon sans compte utilisateur sous un pseudonyme temporaire (session de 3 heures).
- **Stepper Numérique (Séries)** : Stepper premium et dynamique pour ajuster le nombre de séries de 5 en 5 (de 5 à 50) avec boutons "+" et "-" personnalisés et validation de saisie backend.
- **Bouton Retour Circulaire** : Composant global `.btn-back-round` avec design en verre trempé, unifié sur les en-têtes de Setup, Profil et Administration.

### Modifié
- **Restructuration de l'écran Setup (Solo)** : Renommage propre de l'écran `welcome` en `setup` (fichiers `setup.html` et `setup.css`, imports dans `style.css`, routeur SPA et variables JS associées dans `GameView.js` et `app.js`).
- **Suppression d'éléments Setup** : Retrait du message d'accueil redondant *"Bienvenue, [joueur] !"* et du sous-titre de la carte solo pour maximiser l'espace vertical disponible.
- **Responsivité de la Navbar** : Comportement adaptatif et ordonné pour masquer les éléments superflus si l'écran rétrécit (le nom d'utilisateur sous `750px`, le bouton de déconnexion sous `600px` et le bouton de thème sous `450px`).
- **Centrage et dimensionnement des cartes** : Recentrage géométrique parfait des cartes Solo, Multi et Profil sous la navbar (hauteur fluide calculée sur `#app` via `flex: 1` et suppression des calculs statiques) et élargissement à `1000px` sur PC pour une meilleure occupation de l'espace.
- **Stabilité visuelle du classement** : Implémentation de `scrollbar-gutter: stable` et `table-layout: fixed` sur le classement solo pour éliminer les décalages de mise en page horizontaux lors du changement d'onglet.

### Corrigé
- **Navigation SPA (Boutons Retour)** : Modification des cibles de retour de `href="#"` à `href="#/"` afin d'être interceptées correctement par le routeur de l'application et de rediriger instantanément vers l'accueil.
- **Défilement résiduel (Scroll)** : Suppression des barres de défilement superflues sur PC pour les écrans Setup et Salons de jeu en optimisant les marges et les dimensions intérieures des cartes.
