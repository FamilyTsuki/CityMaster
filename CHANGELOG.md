# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [1.3.1] - 2026-08-04

### Ajouté
- **Visualisation de la difficulté en admin** : Affichage d'un badge indiquant la méthode de tri active (par longueur, par nomenclature ou par centre-ville) dans la liste des routes administratives.
- **Centrage automatique de la carte** : Zoom et centrage automatique (`fitBounds`) sur le tracé du quartier ou de la route sélectionné lors de l'ouverture de l'éditeur d'administration.

### Corrigé
- **Importation et tracé des routes** : Correction du bug d'aplatissement des points de coordonnées pour les tracés de type `MultiLineString` dans l'éditeur d'administration (seule la première ligne est désormais lue au lieu d'un `flat` complet destructeur).
- **Gestion des types de géométrie** : Support plus robuste des géométries de type `LineString`, `MultiLineString` et `Point` dans la vue administrative des routes, prévenant d'éventuelles erreurs JS.
- **Nettoyage du projet** : Suppression du fichier mémo obsolète `a_fair.md` et mise à jour de la configuration de `.gitignore`.

## [1.3.0] - 2026-08-03

### Ajouté
- Mode "Compétition en Équipe" : Algorithme de génération par graine aléatoire (PRNG Mulberry32) via le paramètre `test_id` garantissant un tirage équitable de 10 rues (3 faciles, 3 moyennes, 4 difficiles) pour les équipes.
- Injection dynamique des routes personnalisées (`custom_routes.json`) dessinées en admin dans le moteur de jeu et les statistiques.

### Modifié
- **Synchronisation des difficultés** : Harmonisation stricte des calculs de difficulté (`length`, `nomenclature`, `center`) entre l'espace administrateur, l'API de statistiques et le contrôleur de jeu.
- **Nomenclature des voies** : Prise en compte des pluriels et des formes alternatives ("chemins", "allées", "chemain", etc.) pour la classification des axes mineurs.
- **Refactorisation CSS** : Centralisation de tous les styles bruts et en ligne (`style="..."`, `.style.cssText`) dans les feuilles de style modularisées (`navbar.css`, `welcome.css`, `legal.css`, `certificate.css`, `admin.css`, `components/forms.css`).
- **Clean Code & Architecture** : Élimination de tous les commentaires de code inutiles et traduction de l'ensemble des logs de console et erreurs serveur en anglais.

### Corrigé
- **Éditeur de routes (AdminView)** : Correction du problème d'affichage reliant le dernier point tracé au premier point (passage en mode ligne ouverte `fill: false`).
- **Sauvegarde des paramètres** : Correction de la requête API de mise à jour du mode de difficulté global (`difficulty_mode`).
- **Mise à jour des références** : Correction du fichier `.gitignore` pour cibler `TODO.md` suite au renommage de `a_fair.md`.




