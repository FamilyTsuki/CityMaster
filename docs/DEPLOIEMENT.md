# Mettre à jour le serveur

Procédure pour mettre à jour une installation existante (par exemple citymaster.tsuki-dev.fr) sans perdre les données du serveur ni le travail des administrateurs.

## Données propres au serveur

Ces fichiers sont ignorés par git (`.gitignore`) : `git pull` ne les modifie pas et ne les supprime pas, et le code mis à jour les relit tels quels. Ils n'existent que sur le serveur : ce sont eux qu'il faut sauvegarder.

| Fichier ou dossier | Contenu | Modifié par |
|---|---|---|
| `.env` | secrets et configuration (voir `.env.example`) | à la main |
| `public/assets/data/custom_routes.json` | rues ajoutées, renommées ou supprimées | administration |
| `public/assets/data/custom_districts.json` | quartiers et lotissements | administration |
| `public/assets/data/difficulty_overrides.json` | difficultés forcées (copie de la table `route_difficulties`) | administration |
| `public/assets/data/global_settings.json` | réglages globaux (copie de la table `global_settings`) | administration |
| `public/assets/data/<ville>.json` | données de carte générées depuis OpenStreetMap | génération d'une ville |
| `config/custom_cities.json` | villes découvertes, villes vérifiées | recherche, administration |
| `config/users.json` | comptes du mode local (sans PostgreSQL) | inscription en mode local |
| `uploads/` | avatars des joueurs | profil |

S'y ajoute la base PostgreSQL : comptes, scores, salons, signalements, réglages et difficultés forcées.

Les modifications des admins désignent les rues par leur nom, dans des fichiers séparés des fichiers de ville. Elles restent donc appliquées si une ville est régénérée, sauf pour une rue renommée dans OpenStreetMap entre-temps.

`uploads/avatar_4.webp` est le seul avatar suivi par git (ajouté avant la règle `uploads/`). Ne pas le retirer de git avec `git rm` : le `git pull` suivant le supprimerait du serveur.

## Procédure

1. Sauvegarder (section suivante).
2. `git status` : vérifier les fichiers suivis modifiés sur le serveur.
   - `package-lock.json` (parfois réécrit par `npm install`) ne contient aucune donnée : `git checkout package-lock.json`.
   - `uploads/avatar_4.webp` peut apparaître si le joueur a changé d'avatar : ne pas l'annuler, il ne gêne pas la mise à jour.
3. `git pull --ff-only`
4. `npm install`, puis redémarrer le serveur (`./start.sh` ou le gestionnaire de processus).
5. Lire le début du journal :
   - `PostgreSQL database tables verified.` : mode PostgreSQL ;
   - `[db] PostgreSQL injoignable ... Nouvelles tentatives en arrière-plan` : la base n'est pas encore prête, le serveur se connectera seul dès qu'elle répondra (connexion et administration répondent 503 en attendant) ;
   - `[db] PostgreSQL inutilisable ... Mode local` : base inexistante ou identifiants refusés, vérifier les variables `PG*` du `.env` ;
   - `[users] N compte(s) présent(s) seulement dans users.json ajouté(s)` : comptes créés par une ancienne version pendant une panne de la base, désormais dans PostgreSQL.
6. Ouvrir l'administration sur une ville modifiée : rues, quartiers, difficultés forcées et réglages doivent être inchangés.

Les tests (`npm test`) peuvent être lancés sur le serveur : ils travaillent dans un dossier temporaire et ne touchent ni aux données ni à la base.

## Sauvegarder

```bash
tar czf ~/citymaster-$(date +%F-%H%M).tar.gz --ignore-failed-read \
  .env config/custom_cities.json config/users.json uploads \
  public/assets/data/custom_routes.json public/assets/data/custom_districts.json \
  public/assets/data/difficulty_overrides.json public/assets/data/global_settings.json

# Avec PostgreSQL (mêmes identifiants que dans .env)
pg_dump citymaster > ~/citymaster-$(date +%F-%H%M).sql
```

Les fichiers de ville (`public/assets/data/<ville>.json`) peuvent être régénérés depuis OpenStreetMap ; les ajouter à l'archive pour retrouver exactement la même carte.

## À ne pas faire sur le serveur

| Commande | Conséquence |
|---|---|
| `git clean -x` ou `git clean -X` | supprime les fichiers ignorés : toutes les données ci-dessus (`git clean -fd` sans `x` les épargne) |
| `git stash --all` | met de côté les fichiers ignorés : le jeu tourne sans données jusqu'au `git stash pop` |
| Supprimer le dossier et recloner | perd tous les fichiers ignorés s'ils n'ont pas été copiés avant |
| `git rm` sur un fichier de données | le supprime du serveur au `git pull` suivant |
| Supprimer un fichier de ville sans sauvegarde | la carte régénérée peut différer (données OpenStreetMap à jour) |

`git reset --hard` épargne les fichiers ignorés, mais annule les fichiers suivis modifiés sur le serveur (dont `uploads/avatar_4.webp`).

## Droits sur les fichiers

Les fichiers JSON sont écrits dans un fichier temporaire puis renommés, ce qui demande le droit d'écriture sur leur dossier. Si le serveur ne peut modifier que les fichiers eux-mêmes, il les réécrit directement et l'indique une fois dans le journal (`[jsonStore] ... écriture directe`). Les liens symboliques sont suivis et les droits des fichiers conservés.
