# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

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




