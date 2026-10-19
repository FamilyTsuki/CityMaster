# Changelog - CityMaster

Toutes les modifications majeures du projet CityMaster sont répertoriées ci-dessous par version.
Ce fichier est crée et acctualiser par ia.

## [2.9.1] - 2026-10-19

### Harmonisation Graphique & Design Système
- **Arrière-plan d'ambiance persistant et global (`#app-backdrop`)** :
  - Déplacement de la pile visuelle d'ambiance (dégradé radial thématique `var(--landing-bg-gradient)`, textures SVG superposées de papier canson `cansonGrainMedium` & fibres `paperFibers`, et bulles flottantes organiques animées `.ambient-bubbles`) au sommet de l'application dans `public/index.html`.
  - Extension de l'atmosphère graphique à **toutes les pages** (Accueil, Configuration de partie, Salons multijoueurs, Espace Profil, Connexion / Inscription, Mentions légales & RGPD, Diplôme / Bilan).
  - Élimination des ruptures visuelles brutales lors de la navigation entre écrans.
  - Masquage automatique et performant de l'arrière-plan d'ambiance lors des sessions de jeu actives et du chargement de vol (`body.in-game-session`, `body:has(#game-screen.active)`, `body:has(#load-screen.active)`).

### En-têtes & Navigation Harmonisée
- **Bouton de retour universel standardisé (`.btn-back-round`)** :
  - Intégration du composant circulaire `.btn-back-round` sur la page de connexion / inscription (`public/screens/auth.html`) dans un en-tête `.auth-header` aligné avec le titre.
  - Intégration du bouton `.btn-back-round` sur la page des mentions légales (`public/screens/legal.html`) avec `.legal-header-top` pour une parfaite symétrie avec les écrans de configuration, de salons et de profil.
  - Prise en charge automatique de la navigation retour vers l'accueil via le routeur global (`src/Router.js`).
  - Suppression des styles résiduels discordants (`#auth-screen::before` avec ses anciens dégradés jaunes/oranges codés en dur) pour laisser transparaître le fond papier et les bulles adaptatives.

### Tests Unitaires & Non-régression
- **Validation intégrale de la suite de tests (`npm test`)** :
  - 31/31 tests unitaires validés avec succès (0 régression, 0 erreur).

---

## [2.9.0] - 2026-10-19

### Nouveautés & Expérience Utilisateur (Thème & Bulles d'Accueil)
- **Bulles de fond d'accueil chromatiquement adaptatives (`landing.css`)** :
  - En mode sombre (`[data-theme="dark"]`) : intégration d'une palette flamboyante rouge / orange (`--landing-bubble-1` à `--landing-bubble-6`) mariant des teintes rouge vif, corail incandescent, orange vif et ambre chaud avec `mix-blend-mode: screen` pour un rendu lumineux et atmosphérique.
  - En mode clair (`:root, [data-theme="light"]`) : intégration d'une palette rafraîchissante de bleus (`--landing-bubble-1` à `--landing-bubble-6`) mariant le bleu azur, le bleu ciel, le cyan et le bleu saphir doux, apportant un contraste délicat et harmonieux sur le fond crème papier.
  - Les 6 bulles animées flottantes utilisent désormais les variables CSS dédiées avec une transition d'opacité fluide lors du basculement instantané de thème.

### Internationalisation & Multilingue (i18n)
- **Traduction intégrale de la modale d'installation PWA (`#install-modal` & `.install-card-footer-tip`)** :
  - Ajout des attributs `data-i18n` sur le titre, le sous-titre, le bouton de fermeture (`common.close`), ainsi que sur l'ensemble des étapes d'installation spécifiques aux plateformes iOS (Safari), Android (Chrome) et Ordinateur (Chrome / Edge).
  - Traduction complète de l'encadré d'information `.install-card-footer-tip` dans `fr.json` et `en.json` (*« Inutile de chercher sur l'App Store ou Google Play : CityMaster s'installe directement depuis votre navigateur... »* / *« No need to search the App Store or Google Play: CityMaster installs directly from your browser... »*).
- **Internationalisation dynamique de la bascule de thème (`NavbarView.js`)** :
  - Raccordement du sélecteur de mode clair / sombre du menu burger et de l'en-tête à `I18nService`.
  - Prise en charge des libellés dynamiques `nav.light_mode`, `nav.dark_mode`, `nav.switch_to_light`, et `nav.switch_to_dark` avec écoute des changements de langue à chaud (`onLanguageChange`).
- **Complétude des templates d'administration et d'authentification** :
  - Ajout de balises `data-i18n` sur les cartes du tableau de bord d'administration (`admin.html`), les formulaires d'édition de quartiers et de routes, la barre de filtrage par difficulté et les signalements d'utilisateurs.
  - Ajout de `data-i18n` sur le lien et texte de basculement de compte dans `auth.html` (`auth.no_account` et `auth.register_link`).
  - Maintien d'une parité stricte à 100 % entre les dictionnaires `fr.json` et `en.json`.

### Tests unitaires & Non-régression
- **Validation complète de la suite de tests (`npm test`)** :
  - 31 tests unitaires validés avec succès (0 échec, 0 régression), incluant les vérifications automatisées de parité des dictionnaires et d'existence de l'intégralité des attributs `data-i18n*` des templates.

---

## [2.8.20] - 2026-10-15

### Nouveautés & Expérience Utilisateur (PWA & Navbar)
- **Visibilité permanente du bouton d'installation PWA (`#pwa-install-btn`)** :
  - Déplacement du bouton d'installation dans `.navbar-header-actions` pour garantir sa visibilité continue dès le premier coup d'œil, sans nécessiter d'ouvrir le menu burger sur mobile.
  - Sur mobile ($\le 768\text{px}$) : affichage sous forme de bouton d'action circulaire dédié ($2.35\text{rem}\times 2.35\text{rem}$) aux côtés de la bascule de thème et du menu burger, avec icône de téléchargement contrastée et info-bulle contextuelle accessible.
  - Sur bureau ($> 768\text{px}$) : affichage du bouton complet avec icône et libellé d'action (*« Installer »* / *« Install »*), groupé élégamment avec les actions principales sur l'extrémité droite de la barre de navigation.
  - Ajout du bouton d'installation secondaire `.menu-install-btn` dans le tiroir mobile déroulant (`.navbar-actions.open`) pour un accès immédiat sous toutes les modalités de navigation.

### Corrections de bugs & Rendu Graphique
- **Résolution du conflit de contraste et de masquage blanc sur blanc** :
  - Correction de la collision CSS entre `.btn.secondary` et `.pwa-install-btn-style` qui forçait un fond blanc `#ffffff` avec texte blanc `#ffffff` et bordure transparente en mode clair (rendant le bouton invisible).
  - Application d'un style contrasté à haute lisibilité en mode clair (`background: var(--primary-light)`, `color: var(--primary)`, bordure `1.5px solid var(--primary)`) et en mode sombre.
  - Remplacement de la variable CSS indéfinie `var(--surface)` par `var(--bg-card-solid)`.
  - Alignement automatique de la marque (`.navbar-brand { margin-right: auto; }`) éliminant le centrage isolé du bouton de thème sur grand écran.

### Tests unitaires & Non-régression
- **Validation complète de la suite de tests (`npm test`)** :
  - 31 tests unitaires validés avec succès (0 échec, 0 régression).

---

## [2.8.19] - 2026-10-14

### Nouveautés & Refonte Visuelle (Dézoomage & Panorama du Globe)
- **Dézoomage équilibré du globe terrestre (`load.html`)** :
  - Réduction de l'échelle d'affichage du globe de $2804\text{px}$ à $1400\times 1000\text{px}$ (`x="-245"`, `y="385"`), divisant le facteur de zoom par deux.
  - Découverte panoramique des continents cartoon (continent central vert intense, masses continentales latérales et émergence des îles) qui étaient auparavant hors-champ.
  - Ajustement géométrique de l'ellipse supérieure assurant que l'horizon terrestre épouse rigoureusement la courbure parabolique de vol de l'avion sur l'ensemble de la trajectoire.

### Optimisations & Qualité Visuelle
- **Harmonisation de l'espacement et dégagement de vol** :
  - Espacement régulier et constant de ~38px entre l'arc de vol et la surface du globe de $X = 60$ à $X = 920$.
  - Maintien d'un espace aéré pour l'avion et les monuments flottants (espacement de ~1cm au-dessus de la ligne sans interférence visuelle).
  - Remplissage complet du bas de l'écran sans rupture angulaire ni bords vides.

### Tests unitaires & Non-régression
- **Validation de la suite de tests (`npm test`)** :
  - Exécution et passage sans régression des 31 tests unitaires du projet.

---

## [2.8.18] - 2026-10-13

### Nouveautés & Refonte Visuelle (Illustration Cartoon de la Terre)
- **Intégration de la nouvelle illustration cartoon du globe terrestre (`earth.png`, `load.html`)** :
  - Remplacement de l'ancienne image par la nouvelle illustration cartoon fournie (océans bleu cyan vif, continents vert intense et nuages blancs).
  - Traitement d'extraction du fond noir avec détourage morphologique et lissage sous-pixel (élimination totale des franges sombres et artefacts de compression JPEG).
  - Redimensionnement haute fidélité en 1800×1800 Lanczos3 avec transparence alpha progressive sans effet de marche d'escalier.
  - Conservation du dôme supérieur naturel non coupé épousant parfaitement la courbure parabolique de la trajectoire de vol.

### Optimisations & Qualité de Rendu
- **Suppression des bordures parasites et netteté maximale** :
  - Lissage anti-crénelage anti-aliasing du contour circulaire pour une transition fluide sur le ciel étoilé.
  - Suppression de tout résidu de détourage sur l'ensemble de l'horizon de vol.

### Tests unitaires & Non-régression
- **Validation complète de la suite de tests (`npm test`)** :
  - Exécution et passage sans régression de l'ensemble des 31 tests unitaires.

---

## [2.8.17] - 2026-10-13

### Nouveautés & Refonte Visuelle (Horizon Terrestre Natif)
- **Suppression du masque de découpe artificiel et intégration de l'illustration native (`load.html`, `flight-loader.css`)** :
  - Élimination complète du `clipPath` tranchant, du rectangle de base et des traits de contour artificiels.
  - Positionnement de l'illustration circulaire intégrale de la Terre (`earth.png`, 2804×2804) centrée à $(X=455, Y=1793)$ avec un rayon de 1402px.
  - Le dôme circulaire supérieur de l'illustration forme naturellement la ligne d'horizon du globe terrestre, épousant la courbure de vol avec un espacement constant et harmonieux de 45px sur l'ensemble de la largeur de l'écran.
  - Suréchantillonnage haute résolution de `earth.png` (2000×2000 Lanczos3 avec accentuation de netteté) pour un rendu net et texturé sur tous les écrans HD/Retina.
  - Nettoyage du balisage SVG (`<defs>`) et des feuilles de styles CSS pour éliminer tout résidu de masquage obsolète.

### Tests unitaires & Non-régression
- **Validation de la suite de tests (`tests/*.test.js`)** :
  - 31/31 tests unitaires validés avec succès (`npm test`).

---

## [2.8.16] - 2026-10-13

### Nouveautés & Refonte Visuelle (Ciel & Grille Céleste Peek)
- **Harmonisation stricte de la courbure de `peek-sky-grid` (`load.html`, `flight-loader.css`)** :
  - Remplacement des anciens arcs disparates par 6 parallèles paraboliques strictement concentriques suivant la même équation quadratique que la trajectoire de vol et l'horizon terrestre ($A = 0.0003645, B = -0.33045$).
  - Espacement uniforme de 70px entre chaque arc de méridien sur toute la largeur du ciel ($X = -150$ à $X = 1150$).
  - Méridiens radiaux modélisés par des rayons purs émanant du centre de courbure terrestre sous le globe, coupant les parallèles sous un angle rigoureusement orthogonal.
- **Répartition spatiale naturelle et poétique des étoiles (`load.html`, `flight-loader.css`)** :
  - Dispersion de 18 étoiles à 5 branches à travers l'ensemble de la voûte céleste (ciel supérieur, flancs latéraux, zones médianes au-dessus de la trajectoire).
  - Variations d'échelles (rayons de 7px à 15px) et d'opacités subtiles (`0.25` à `0.45`) reproduisant l'effet de constellation et de scintillement cartoon fidèle à Peek.
  - Ajout d'ombres et d'un halo céleste doux en thème sombre via `.peek-sky-stars polygon`.

### Tests unitaires & Non-régression
- **Validation complète de la suite de tests (`tests/*.test.js`)** :
  - 31/31 tests unitaires validés avec succès (`npm test`).

---

## [2.8.15] - 2026-10-13

### Nouveautés & Refonte Visuelle (Écran de Chargement Peek)
- **Résolution du chevauchement Texte vs Monuments (`load.html`, `flight-loader.css`)** :
  - Surélévation du chemin de texte courbé (`#flight-curve-text-path`, `d="M 40 299 Q 500 160 960 330"`) dans la partie haute du ciel céleste.
  - Dégagement d'un espace libre constant d'environ 30px au-dessus des monuments (Arc de Triomphe, Pyramide du Louvre, Tour Eiffel), éliminant toute collision ou superposition visuelle.
  - Caisse mixte et typographie cartoon fidèle à Peek : `Loading...Loading...Loading...Loading..` avec police arrondie 24px et ombrage doux.
- **Horizon terrestre continu sans aucun vide ni coupure angulaire (`load.html`, `flight-loader.css`)** :
  - Extension du `clipPath` et du tracé de l'horizon de $X = -200$ à $X = 1200$ (`d="M -200 547 Q 500 214 1200 595 L 1200 800 L -200 800 Z"`), garantissant une sortie fluide et propre au-delà des bordures d'écran sans aucun coin triangulaire vide.
  - Ajout d'une base océanique continue sous l'horizon (`<rect class="peek-earth-ocean-base">`, dégradé `#12497e` vers `#071b33`) assurant une surface planétaire pleine et riche sur toutes les résolutions d'écran (16:9, mobile, ultra-large).
  - Redimensionnement panoramique harmonieux de l'illustration de la Terre (`earth.png`, 1200×900) préservant l'aspect naturel des continents sans écrasement en galette.
  - Ajout d'une aura atmosphérique discrète (`.peek-earth-atmosphere`) le long de l'horizon.
- **Espace de coordonnées 16:9 sans déformation non-uniforme (`load.html`)** :
  - Mise à jour du `viewBox` du SVG en `0 0 1000 560` (ratio 16:9 naturel), évitant tout étirement vertical excessif des caractères de texte, des étoiles et des grilles célestes.
  - Recalcul de la trajectoire active de vol (`d="M 60 403 Q 500 280 920 426"`, longueur réelle 874px) synchronisée avec `FlightLoader.js`.
- **Nuage de destination et question marks Peek éclatants (`flight-loader.css`)** :
  - Conservation de l'esthétique cumulus crème/ivoire douce (`#fbf9ee` / `#eae0c8`) avec halo en thème sombre (suppression du filtre gris suie terne).
  - Repositionnement du badge de pourcentage de vol (`.flight-footer-info`) en bas à droite de l'écran pour libérer complètement la vue sur le globe terrestre.

### Corrections de bugs & Refactoring
- **Suppression d'un caractère parasite (`load.html`)** :
  - Nettoyage d'une chaîne résiduelle `É&É²` dans le balisage de l'écran de chargement.
- **Synchronisation précise de la ligne de progression (`FlightLoader.js`)** :
  - Mise à jour du calcul de `stroke-dashoffset` sur la longueur réelle de 874px avec mise à jour simultanée de la propriété de style et de l'attribut SVG.

### Tests unitaires & Non-régression
- **Validation complète de la suite de tests (`tests/*.test.js`)** :
  - Exécution réussie des 31 tests unitaires du projet (`npm test`).

---

## [2.8.14] - 2026-10-13

### Nouveautés & Refonte Visuelle
- **Adoucissement réaliste de la courbure du vol et de la Terre (`load.html`, `FlightLoader.js`, `tests/load_route.test.js`)** :
  - Remplacement de l'arc trop plongeant/pentu par une courbure douce et naturelle fidèle à Peek (flèche verticale de 12% au lieu de 54%) :
    - Trajectoire de vol : `M 60 187 Q 500 130 920 198` (décollage à $Y=72\%$, apogée douce à $Y=62\%$, atterrissage à $Y=76\%$).
    - Tangage de l'avion doux et organique : $-7.4^\circ$ au décollage, $0^\circ$ au zénith, $+6.6^\circ$ dans le nuage.
    - Ligne d'horizon de la Terre parfaitement parallèle : `M -60 237 Q 517 140 1060 256` ($\Delta Y = 32\,\text{px}$).
    - Texte courbé supérieur aligné : `M 50 168 Q 500 112 930 180`.
  - Recalcul de la longueur exacte du tracé actif (`864px`) pour une progression fluide sans à-coup.
  - Réajustement des positions de croisière des 3 monuments et du nuage de destination le long de la nouvelle trajectoire douce.

### Tests unitaires & Non-régression
- **Validation complète de la suite de tests (`tests/load_route.test.js`)** :
  - 31/31 tests passés avec succès (`npm test`).

---

## [2.8.13] - 2026-10-13

### Nouveautés & Refonte Plein Écran (Style Peek)
- **Affichage plein écran immersif sur toute la page (`flight-loader.css`)** :
  - Suppression de la boîte centrale confinée (`max-width: 48rem`, marges, paddings et rayon de bordure) : la scène de vol et le ciel sépia recouvrent désormais l'intégralité du viewport (`100vw` × `100vh` / `100dvh`).
  - La voûte céleste, la grille des méridiens et les constellations occupent tout l'espace d'affichage de manière immersive comme dans le jeu original Peek.
  - La barre de progression fine rouge au sol est ancrée sur toute la largeur de l'écran en bas (`height: 6px`), avec le badge de pourcentage de chargement flottant au-dessus avec effet glassmorphism discret.
- **Courbure strictement identique et parallèle entre la Terre et l'avion (`load.html`, `flight-loader.css`)** :
  - Définition d'un clipPath d'horizon (`#peek-earth-horizon-clip`, `d="M -60 271 Q 517 34 1060 317 L 1060 450 L -60 450 Z"`) généré par la même fonction quadratique que la trajectoire de l'avion (`d="M 60 187 Q 500 47 920 213"`), avec un décalage vertical constant $\Delta Y = 40\,\text{px}$.
  - La surface de la Terre et la ligne de vol de l'avion suivent une courbure parfaitement parallèle à chaque point de coordonnées $X$.
  - Tracé au trait de la ligne d'horizon cartoon (`.peek-earth-horizon-stroke`, `#726652`) épousant cette même arche continue d'un bord à l'autre de l'horizon.

### Tests unitaires & Non-régression
- **Validation complète de la suite de tests (`tests/load_route.test.js`)** :
  - 31/31 tests passés avec succès (`npm test`).

---

## [2.8.12] - 2026-10-13

### Nouveautés & Refonte Visuelle
- **Détourage intégral au trait de la planète Terre (`earth.png`)** :
  - Découpage strict au ras du contour noir franc de la planète Terre ($R = 217.5px$), éliminant la totalité du fond d'espace sombre et des tourbillons sombres pour ne conserver que le globe illustré net et éclatant.
  - Anti-aliasing sub-pixel soigné pour des bordures lisses et transparentes.
  - Poids optimisé à 83 Ko (-88% par rapport à l'image d'origine).
- **Déformation panoramique à l'horizon (`load.html`, `flight-loader.css`)** :
  - Intégration directe du globe dans le SVG du vol avec `preserveAspectRatio="none"` et dimensions panoramiques étirées (`x="-100" y="150" width="1200" height="280"`).
  - La Terre épouse désormais fidèlement la courbure panoramique de l'horizon de Peek d'un bout à l'autre de l'écran (de gauche à droite), formant un arc de cercle étendu sous la trajectoire de vol.
  - L'avion décolle au ras de l'horizon à gauche, survole les continents étirés au zénith et plonge vers le nuage à droite.
  - Unification du système de coordonnées SVG (1000x260) pour une synchronisation géométrique parfaite à chaque résolution.

### Tests unitaires & Non-régression
- **Validation complète de la suite de tests (`tests/load_route.test.js`)** :
  - 31/31 tests passés avec succès (`npm test`).

---

## [2.8.11] - 2026-10-13

### Nouveautés & Refonte Visuelle
- **Intégration du globe terrestre illustré avec halo atmosphérique (`earth.png`, `load.html`, `flight-loader.css`)** :
  - Intégration de la nouvelle illustration de la planète Terre (`public/assets/images/earth.png`) fournie par l'utilisateur.
  - Découpage et détourage de haute précision avec suppression complète du fond d'espace sombre extérieur et préservation du halo bleu cyan atmosphérique en dégradé alpha fluide (sans contour parasite).
  - Optimisation sans perte de la compression PNG réduisant la taille du fichier de 728 Ko à 141 Ko (-80%).
  - Positionnement responsive du globe au bas de la scène de vol sous la trajectoire de croisière (`.peek-earth-container`, `top: 48%`, `width: clamp(480px, 76vw, 660px)`), garantissant un cercle parfait sans étirement ni déformation quel que soit le ratio d'écran.
  - Séparation de l'architecture graphique en calques indépendants : arrière-plan céleste avec grille et étoiles (`z-index: 1`), globe terrestre illustré (`z-index: 2`), trajectoire de vol et texte courbé (`z-index: 3`), avion, nuage et monuments (`z-index: 15-25`).
  - Ajout d'une ombre portée douce et d'une lueur atmosphérique subtile adaptée aux modes clair et sombre (`drop-shadow`).

### PWA & Mise en cache hors-ligne
- **Mise en cache du globe terrestre (`public/sw.js`)** :
  - Ajout de `"/assets/images/earth.png"` dans la liste des assets statiques (`STATIC_ASSETS`) du Service Worker pour un affichage instantané et une disponibilité hors-ligne totale.

### Tests unitaires & Non-régression
- **Couverture des tests (`tests/load_route.test.js`)** :
  - Ajout de tests de non-régression validant la présence du conteneur du globe terrestre `.peek-earth-container` et de sa ressource `/assets/images/earth.png` dans le template `load.html`.
  - 31/31 tests passés avec succès (`npm test`).

---

## [2.8.10] - 2026-10-13

### Nouveautés & Refonte Visuelle (Inspirée de Peek)
- **Horizon terrestre et globe illustré (`load.html`, `flight-loader.css`)** :
  - Intégration d'une courbure de globe terrestre en bas de l'écran avec océan turquoise/sauge (`#8cb5b3`), continents stylisés aux contours chauds (`#ded2af` / `#726652`) et nuages d'horizon décoratifs.
- **Grille céleste et fond vintage (`load.html`, `flight-loader.css`)** :
  - Ajout d'une voûte céleste aux dégradés chauds beige/sépia avec méridiens et parallèles courbes, parsemée de constellations d'étoiles illustrées discrètes.
- **Double tracé de trajectoire avec progression dynamique (`load.html`, `flight-loader.css`, `FlightLoader.js`)** :
  - Tracé de fond pointillé charbon sobre (`.peek-track-bg`) indiquant l'itinéraire à venir.
  - Tracé dynamique rouge corail éclatant (`#flight-curve-progress-line`, `#e63946`) révélant en temps réel le chemin parcouru sous l'avion via calcul d'offset de stroke.
- **Texte incurvé suivant la trajectoire de vol (`load.html`, `flight-loader.css`)** :
  - Ajout du bandeau typographique dynamique `LOADING...LOADING...LOADING...LOADING..` épousant fidèlement la courbe SVG (`<textPath>`) au-dessus de l'avion.
- **Nuage cumulus multi-lobé stylisé Peek (`load.html`)** :
  - Silhouette de cumulus organique à double ton (`#f4ecd8` / `#e5d9bd`) avec ombre douce et trait chaud façon bande dessinée.
- **Trio de points d'interrogation mystère '???' (`load.html`, `flight-loader.css`)** :
  - Remplacement du glyphe unique par le trio emblématique de Peek (`???`) avec inclinaisons asymétriques (-14°, +4°, +18°), échelle progressive et ombre 3D chaude multicouche (`#564938`), émergeant 0.5s après l'entrée de l'avion dans le nuage.

### Tests unitaires & Non-régression
- **Validation complète de la suite de tests (`tests/load_route.test.js`)** :
  - 31/31 tests passés avec succès (`npm test`).

---

## [2.8.9] - 2026-10-13

### Nouveautés & Nouvelles fonctionnalités
- **Élévation des monuments à ~1cm de la trajectoire pointillée (`FlightLoader.js`, `flight-loader.css`)** :
  - Décalage vertical des icônes de monuments de `32px` (~1cm) au-dessus de la ligne (`translate(-50%, calc(-100% - 32px))`) afin d'éviter tout contact direct ou chevauchement avec les pointillés du vol.
  - Conservation de l'angle de tangage dynamique (`rotate(${pitch}deg)`) le long de la pente de la courbe.
- **Animation fluide d'apparition pop-up pour les monuments (`FlightLoader.js`, `flight-loader.css`)** :
  - Effet de surgissement élastique dynamique (`scale(0.6)` ➔ `scale(1)`) avec élévation ascendante depuis `calc(-100% - 14px)` jusqu'à `calc(-100% - 32px)`.
  - Courbe de transition organique à ressort (`cubic-bezier(0.34, 1.45, 0.64, 1)`), combinée à un flou progressif doux (`filter: blur(4px)` ➔ `blur(0px)`) et une ombre portée douce (`drop-shadow(0 4px 8px rgba(0, 0, 0, 0.16))`).

### Tests unitaires & Non-régression
- **Validation complète de la suite de tests (`tests/load_route.test.js`)** :
  - 31/31 tests passés avec succès (`npm test`).

---

## [2.8.8] - 2026-10-13

### Nouveautés & Nouvelles fonctionnalités
- **Apparition différée du point d'interrogation 0.5s après l'entrée de l'avion (`flight-loader.css`)** :
  - Ajout d'un délai de transition de `0.5s` (`500ms`) sur `.mystery-question-mark` dès que le nuage devient actif (`.destination-cloud.active`).
  - L'avion plonge et s'évapore complètement dans le nuage, puis 0.5s plus tard, le point d'interrogation mystère `?` émerge en douceur et s'élève au-dessus du nuage (`top: -24px`).
  - Disparition instantanée sans délai lors d'une réinitialisation sous 80%.

### Optimisations & Graphisme
- **Stabilisation complète du nuage après son apparition (`flight-loader.css`)** :
  - Suppression de toutes les animations d'ondulation ou de flottement continu (`cloudVaporFloat`, `cloudVaporActive`, mise à l'échelle de `.cloud-body`).
  - Le nuage ne conserve que son animation d'apparition vaporeuse par condensation à 50%, et reste ensuite parfaitement net, stable et ancré sur sa trajectoire.

### Tests unitaires & Non-régression
- **Validation complète de la suite de tests (`tests/load_route.test.js`)** :
  - 31/31 tests passés avec succès (`npm test`).

---

## [2.8.7] - 2026-10-13

### Nouveautés & Nouvelles fonctionnalités
- **Animation réaliste et fluide d'apparition du nuage (`flight-loader.css`, `FlightLoader.js`)** :
  - Effet de condensation vaporeuse réaliste : le nuage émerge de la brume avec un flou doux progressif (`filter: blur(10px)` ➔ `blur(0px)`) et un gonflement élastique fluide (`scale(0.35)` ➔ `scale(1)`).
  - Courbe de bézier organique dédiée (`cubic-bezier(0.16, 1, 0.3, 1)` et `cubic-bezier(0.34, 1.3, 0.64, 1)`) pour un mouvement vaporeux et naturel.
  - Flottement atmosphérique continu (`cloudVaporFloat`, cycle de `3.2s`) dès la révélation, avec réaction élastique dynamique (`cloudVaporActive`) lors de l'absorption de l'avion à 80%.

### Optimisations & Graphisme
- **Épuration visuelle des monuments (`load.html`, `flight-loader.css`)** :
  - Suppression intégrale des traits de repère orphelins sous les monuments (`.monument-pointer`), allégeant l'interface.
  - Ancrage direct et net de la base des icônes de monuments sur les pointillés de la trajectoire de vol.

### Tests unitaires & Non-régression
- **Validation complète des tests (`tests/load_route.test.js`)** :
  - Validation du cycle d'apparition réaliste du nuage et de l'absence de régression visuelle sur les monuments.
  - 31/31 tests passés avec succès (`npm test`).

---

## [2.8.6] - 2026-10-13

### Nouveautés & Nouvelles fonctionnalités
- **Apparition progressive du nuage de destination à 50% (`FlightLoader.js`, `flight-loader.css`)** :
  - Le nuage reste invisible au décollage et n'apparaît qu'à partir de 50% de progression (`.destination-cloud.revealed`), lors du passage de l'apogée du vol.
  - Transition douce en fondu (`opacity: 0` ➔ `1`) et effet de zoom dynamique (`scale(0.5)` ➔ `scale(1)`).
- **Dimensionnement compact et proportions équilibrées (`flight-loader.css`)** :
  - Réduction de la taille du nuage de ~40% (`88px × 50px` au lieu de `140px × 80px`) pour s'harmoniser parfaitement avec l'avion (`52px × 32px`) et les monuments.
  - Ajustement proportionnel du glyphe du point d'interrogation `?` (`clamp(1.8rem, 3.2vw, 2.4rem)`).
- **Orientation géométrique le long de la trajectoire (`FlightLoader.js`, `flight-loader.css`)** :
  - Calcul dynamique de la tangente de descente à $t=0.85$ (~`+15.9°`) appliquée via variable CSS `--cloud-pitch` et rotation `rotate(var(--cloud-pitch))`.
  - Redressement vertical automatique du point d'interrogation `?` (`rotate(calc(-1 * var(--cloud-pitch)))`) pour une lisibilité optimale au-dessus du nuage incliné.

### Tests unitaires & Non-régression
- **Validation complète des tests (`tests/load_route.test.js`)** :
  - Vérification du masquage du nuage pour `progress < 50%` (`classList.contains('revealed') === false`).
  - Vérification de l'apparition et de l'orientation à `progress = 50%` (`classList.contains('revealed') === true`, `scale(1)`, `rotate(15.9deg)`).
  - Validation de l'absorption de l'avion et activation du nuage mystère à $\ge 80\%$.
  - 31/31 tests passés avec succès (`npm test`).

---

## [2.8.5] - 2026-10-13

### Nouveautés & Nouvelles fonctionnalités
- **Positionnement et rotation dynamiques des monuments sur la trajectoire (`FlightLoader.js`, `flight-loader.css`)** :
  - Ancrage automatique de chaque monument (`Arc de Triomphe` à ~25%, `Pyramide du Louvre` à ~52%, `Tour Eiffel` à ~74%) directement sur la courbe Bézier pointillée de vol.
  - Calcul en temps réel de la tangente géométrique de la trajectoire pour chaque monument : chaque repère s'incline harmonieusement selon la pente locale (`-8.3°` en montée, `+2.6°` près du sommet, `+11.5°` en descente).
  - Ancrage du pointeur sur la courbe (`transform-origin: 50% 100%`) avec apparition dynamique en échelle (`scale(0.6)` à `scale(1)`) dès que l'avion atteint le seuil d'étape.
- **Remplacement du crash par l'arrivée dans le nuage mystère à ~80% (`load.html`, `FlightLoader.js`, `flight-loader.css`)** :
  - Suppression de l'ancienne séquence de crash au sol (cratère, ondes de choc, turbulences violentes en piqué).
  - Dès ~80% de progression, l'avion plonge et disparaît avec élégance et douceur à l'intérieur du nuage de destination (`.in-cloud`, fondu d'opacité et réduction d'échelle).
  - Activation douce du nuage (`.destination-cloud.active`) et émergence du point d'interrogation stylisé `?` invitant à deviner la ville mystère.

### Optimisations, Nettoyage & Refactoring
- **Suppression du code mort lié à l'ancien crash** :
  - Élimination des sélecteurs CSS orphelins `.airplane-carrier.wobbling`, `.airplane-carrier.crashed`, `.plane-smoke-trail`, `@keyframes puffSmoke`, et des balises orphelines dans `load.html`.
  - Nettoyage dans `FlightLoader.js` des méthodes de crash au profit de `#enterCloudSequence()` et `#resetPlaneFlight()`.
  - Harmonisation des règles de transformation CSS et correction des doublons de propriétés dans `.question-mark-glyph`.

### Tests unitaires & Non-régression
- **Mise à jour et validation de la suite de tests (`tests/load_route.test.js`)** :
  - Adaptation des tests pour vérifier la structure du nuage de destination (`#destination-cloud`, `.cloud-svg`, `#mystery-question-mark`).
  - Validation du calcul de positionnement et de l'angle de rotation dynamique des monuments sur la courbe Bézier.
  - Vérification de la disparition en douceur dans le nuage (`.in-cloud`, `.active`) à partir de 80% et jusqu'à 100%.
  - Validation complète de la suite de 31 tests avec succès (`npm test`).

---

## [2.8.4] - 2026-10-13

### Nouveautés & Nouvelles fonctionnalités
- **Découpage & Intégration des icônes de monuments réels (`public/assets/images/monuments/`, `load.html`)** :
  - Découpage précis et détourage avec transparence alpha des 50 monuments de la planche fournie par l'utilisateur (`public/assets/images/monuments/`).
  - Intégration des nouvelles icônes dans les étapes de l'écran de chargement (`load.html`) :
    - **Monument 1 (~28%)** : Arc de Triomphe (`arc-triomphe.png`).
    - **Monument 2 (~56%)** : Pyramide du Louvre (`louvre-pyramid.png`).
    - **Monument 3 (~78%)** : Tour Eiffel (`eiffel-tower.png`).
  - Remplacement des anciens tracés SVG hardcodés par des éléments `<img>` optimisés avec `loading="lazy"` et dimensions adaptées.
  - Gestion du thème sombre dans `flight-loader.css` : filtres de clarté et ombres portées douces pour un contraste impeccable en mode nuit.

### Optimisations & PWA
- **Service Worker (`public/sw.js`)** :
  - Ajout des nouveaux assets de monuments au tableau `STATIC_ASSETS` et incrémentation du cache vers `citymaster-v22` pour un fonctionnement 100% hors-ligne.

### Tests unitaires & Non-régression
- **Validation des tests (`npm test`)** :
  - Suite de 31 tests validée avec succès.

---

## [2.8.3] - 2026-10-13

### Nouveautés & Nouvelles fonctionnalités
- **Orientation continue le long de la trajectoire pointillée (`FlightLoader.js`, `flight-loader.css`)** :
  - L'avion suit désormais précisément la pente géométrique et la tangente de la courbe parabolique en pointillés tout au long de sa traversée.
  - Tangage dynamique calculé en temps réel selon le ratio d'aspect réel du conteneur : décollage ascendant (~ -17.7°), transition douce vers l'horizontale (0°) à l'apogée de l'arc (~46%), plongée progressive en descente (~ +14° à +19°), vibrations intenses lors des turbulences (90-96%) et piqué final à 55° lors de l'impact du crash.
  - Découplage CSS : les animations de flottement doux (`planeBob`) et de secousses (`planeWobble`) ciblent désormais `.plane-svg`, préservant la rotation angulaire continue appliquée à `.plane-wrapper` sans aucun conflit de transformation CSS.

### Optimisations, Nettoyage & Refactoring
- **Suppression intégrale du code mort lié aux anciens contrôles de test** :
  - Retrait des boutons et curseurs de prototypage de `load.html` (`btn-flight-replay`, `btn-flight-pause`, `btn-flight-crash`, `flight-slider`, `btn-flight-theme`).
  - Élimination de toutes les méthodes et champs orphelins dans `FlightLoader.js` (`pause`, `resume`, `replay`, `triggerCrash`, `toggleTheme`, `#bindEvents`, `#setStatus`, `#setDestination`, `#updatePauseButton`, `#isPaused`, `#shakeTimeout`, et suppression de l'import mort `I18nService`).
  - Suppression de toutes les classes CSS orphelines dans `flight-loader.css` (`.flight-header`, `.flight-badge`, `.flight-title`, `.flight-info-dot`, classes `.ctrl-*`).
  - Rétablissement d'un conteneur minimaliste transparent `#flight-sky` sans bordure ni fond pour délimiter proprement la scène aérienne.

### Tests unitaires & Non-régression
- **Validation complète de la suite de tests (`tests/load_route.test.js`)** :
  - Suppression des assertions obsolètes sur les boutons de test.
  - Ajout de vérifications sur le suivi angulaire de la rotation le long de la trajectoire aux étapes clés (décollage, apogée, descente, turbulences et crash).
  - 31/31 tests passés avec succès (`npm test`).

---

## [2.8.2] - 2026-10-13

### Nouveautés & Nouvelles fonctionnalités
- **Refonte graphique intégrale ultra-minimaliste de l'écran de chargement (`/load`)** :
  - **Typographie & En-tête épuré (`public/screens/load.html`, `public/assets/styles/components/flight-loader.css`)** :
    - Remplacement des polices cartoon épaisses et du badge radar "VOL CM-742" par une typographie sans-serif moderne, nette et aérée (`Plus Jakarta Sans`).
    - Ligne d'état inférieure unifiée et élégante combinant le pourcentage et la phase de vol (`54% • Vol de croisière...`).
  - **Avion moderne & Silhouette aérodynamique (`load.html`, `flight-loader.css`)** :
    - Remplacement de l'avion cartoon multicouche par un aéronef vectoriel moderne, fluide et minimaliste aux teintes orange et ardoise avec verrière claire.
  - **Monuments flottants en micro-pills avec trait d'ancrage fin (`load.html`, `flight-loader.css`)** :
    - Remplacement des cartes lourdes à bords épais par des capsules micro-pills translucides en glassmorphism (`backdrop-filter: blur(8px)`).
    - Icônes vectorielles en line-art épuré (Tour Eiffel, Château de la Loire, Mont-Saint-Michel).
    - Trait d'ancrage ultrafin (1.5px) pointant vers la trajectoire de vol à la place des flèches épaisses.
  - **Scène céleste épurée & Trajectoire fine** :
    - Suppression des nuages statiques artificiels pour offrir un espace aérien ouvert et sans distraction.
    - Courbe de vol fine (2px) en pointillés discrets avec lueur d'ambiance atténuée.
    - Barre de chargement au sol affinée (3px).
  - **Crash & Point d'interrogation moderne** :
    - Onde de choc d'impact épurée sous forme d'anneau d'onde circulaire (shockwave).
    - Point d'interrogation `?` lumineux au halo orange vibrant (`#f97316`) et badge blanc sur orange contrasté `"Où sommes-nous ?"`.
  - **Panneau de contrôle discret** :
    - Toolbar de test compacte en capsule transparente à opacité réduite (`0.4`), s'intégrant sans gêner l'animation.

### Optimisations & Performances
- **Allègement du DOM et du CSS** :
  - Réduction de 25% du poids CSS du composant `flight-loader.css`.
  - Suppression des couches d'animation d'ondulation lourdes pour une fluidité d'affichage optimale sur tous les appareils mobiles.

### Tests unitaires & Non-régression
- Validation à 100% de la suite de tests (`npm test` : 31/31 tests passés avec succès).

---

## [2.8.1] - 2026-10-13

### Nouveautés & Nouvelles fonctionnalités
- **Trajectoire de vol en courbe parabolique (`public/screens/load.html`, `src/views/components/FlightLoader.js`, `public/assets/styles/components/flight-loader.css`)** :
  - Remplacement de la ligne horizontale plate par un arc de trajectoire en courbe parabolique (courbe de Bézier quadratique SVG `Q 500 47 920 213` stylisée en pointillés avec lueur atmosphérique).
  - Calcul dynamique de la position $(X, Y)$ et de l'angle d'inclinaison/tangage de l'avion en temps réel le long de la tangente de la courbe (`FlightLoader.#getPointOnCurve(t)`), pour une animation de vol aérienne ultra-dynamique et naturelle.
- **Affichage des monuments au-dessus du vol et masquage strict par défaut** :
  - Les bâtiments/monuments sont désormais **strictement invisibles** (`opacity: 0; visibility: hidden; pointer-events: none`) jusqu'à ce que l'avion atteigne précisément leur étape de vol.
  - Positionnement des monuments **flottant au-dessus de l'aéronef** (`.monument-above`) avec un pointeur directionnel cartoon (`.monument-pointer`) dirigé vers la ligne de vol.
  - Dès qu'une étape est franchie par l'avion, la carte du monument surgit au-dessus de sa trajectoire avec une animation rebondissante fluide (`@keyframes monumentBounceIn`).
- **Épuration graphique & Design cartoon simplifié** :
  - Suppression des graduations et repères superflus au sol sur la barre de progression pour un rendu minimaliste, clair et lisible sur tous les formats d'écran.
  - Séquence de crash final optimisée : l'avion plonge en piqué directement dans le cratère d'impact à la fin de la courbe descendante, déclenchant l'apparition du point d'interrogation géant.

### Optimisations & Performances
- **Formule de Bézier quadratique optimisée** :
  - Évaluation analytique directe en $O(1)$ à chaque tick d'animation sans recalcul lourd du DOM.
  - Fixation des repères de coordonnées en pourcentages relatifs pour un rendu parfaitement responsive et adaptable au redimensionnement de l'écran.

### Tests unitaires & Non-régression
- **Mise à jour des tests dans `tests/load_route.test.js`** :
  - Intégration du sélecteur interne `.plane-wrapper` dans le mock pour la rotation du tangage.
  - Validation des coordonnées initiales ($P_0$ à `left: 6%`, `top: 72%`) et du crash ($P_2$ à `left: 92%`, `top: 82%`).
  - Suite de tests complète validée avec 100% de succès (31 tests passés, 0 échec).

---

## [2.8.0] - 2026-10-13

### Nouveautés & Nouvelles fonctionnalités
- **Refonte Cartoon & Gamifiée de l'écran de chargement (`/load`)** :
  - **Barre de progression & Avion volant (`public/screens/load.html`, `public/assets/styles/components/flight-loader.css`, `src/views/components/FlightLoader.js`)** :
    - Intégration d'un avion cartoon stylisé en SVG (fuselage aérodynamique orange et blanc, cockpit vitré, aile balayée et hélice en rotation continue animée par `@keyframes propSpin`).
    - L'avion traverse horizontalement le ciel le long d'une trajectoire en pointillés orange en synchronisation parfaite avec la barre de progression (de 0% à 100%).
    - Mouvements subtils de tangage cartoon en vol de croisière (`@keyframes planeBob`).
  - **Étapes avec apparition séquentielle de monuments emblématiques** :
    - Étape 1 (~28%) : Apparition rebondissante de la **Tour Eiffel** (Paris) avec son badge informatif.
    - Étape 2 (~56%) : Apparition du **Château de la Loire** (Chambord) avec ses tourelles et fanions.
    - Étape 3 (~78%) : Apparition du **Mont-Saint-Michel** avec son abbaye gothique et vaguelettes.
    - Animation cartoon d'apparition élastique (`@keyframes monumentPop`) et halo lumineux interactif dès que l'étape est franchie.
  - **Séquence finale de turbulences, Crash & Point d'interrogation géant** :
    - À l'approche de la destination (90-96%) : L'avion entre en zone de turbulences avec secousses cartoon (`@keyframes planeWobble`) et traînée de fumée.
    - À l'arrivée (≥ 97%) : L'avion pique du nez vers le sol, s'encastre dans un cratère d'impact avec secousse de l'écran (`@keyframes skyShake`), explosion de bande dessinée ("💥 POUM !") et panaches de fumée animés.
    - Émergence spectaculaire d'un **point d'interrogation géant cartoon (`?`)** avec texte 3D en relief, bordure orange contrastée, halo pulsant (`@keyframes questionPulse`) et macaron stylisé `"Où sommes-nous ?"` / `"Where are we?"`.
  - **Panneau de contrôle et d'expérimentation interactif sur `/load`** :
    - Bouton `Rejouer` (relance l'intégralité du vol).
    - Bouton `Pause / Reprendre` (bascule instantanément l'animation).
    - Bouton `Crash immédiat` (déclenche immédiatement la séquence d'impact).
    - Curseur de scrubbing précis (`input[type="range"]`) pour balayer manuellement la progression de 0 à 100% et inspecter chaque état.
    - Bouton d'inversion rapide du thème (Mode clair / Mode sombre).

### Optimisations & Performances
- **Positionnement absolu et fluidité 40 FPS (`FlightLoader.js`, `flight-loader.css`)** :
  - Suppression des transitions CSS temporisées conflictuelles sur la position horizontale pour garantir une synchronisation instantanée et fluide à chaque frame sans décalage.
  - Optimisation du contexte d'empilement (`z-index: 25` pour les monuments, `z-index: 15` pour l'aéronef) afin que le point d'interrogation et l'explosion émergent nettement au premier plan lors du crash.
  - Structure vectorielle SVG légère ne nécessitant aucun téléchargement de texture bitmap additionnelle.

### Sécurité & Architecture
- **Composant autonome `FlightLoader` (`src/views/components/FlightLoader.js`)** :
  - Architecture orientée objet avec encapsulation privée de l'état du vol et nettoyage systématique des timers et écouteurs (`destroy()`).
  - Tolérance complète aux environnements headless et tests Node.js grâce à des gardes sécurisés sur `document`, `navigator` et `localStorage`.
  - Connexion automatique au cycle de vie du routeur frontend dans `src/app.js` (démarrage automatique à l'entrée sur `/load`, arrêt propre lors de toute navigation sortante).

### Internationalisation (i18n)
- **Ajout des clés du module de vol dans `fr.json` et `en.json`** :
  - Clés bilingues complètes : `flight.flight_title`, `flight.flight_badge`, `flight.takeoff`, `flight.cruising`, `flight.monument_eiffel`, `flight.monument_chambord`, `flight.monument_mont`, `flight.turbulence`, `flight.crashed`, `flight.mystery`, `flight.replay`, `flight.pause`, `flight.resume`, `flight.crash_now`, `flight.progress_label`, `flight.toggle_theme`.

### Tests unitaires & Non-régression
- **Extension de `tests/load_route.test.js`** :
  - Validation de l'intégrité structurelle de tous les nouveaux éléments (`#airplane-carrier`, `.plane-propeller`, monuments 1, 2 et 3, site de crash, cratère, `#mystery-question-mark`, glyph, badge et contrôles).
  - Test unitaire programmatique de la logique du contrôleur `FlightLoader` (initialisation à 0%, franchissement des seuils à 30%, 60%, 80%, turbulences à 92%, et déclenchement du crash à 100%).
- **Exécution complète des tests** : 31 tests unitaires validés avec succès (31/31 passés, 0 échec).

### Cache & Cycle de vie
- Enregistrement de `public/assets/styles/components/flight-loader.css` et `src/views/components/FlightLoader.js` dans `STATIC_ASSETS` du Service Worker.
- Incrémentation du cache Service Worker en `citymaster-v18` dans `public/sw.js`.
- Mise à jour des balises de cache-busting `?v=2.8.0` dans `public/index.html` et synchronisation du badge dans `README.md`.

---

## [2.7.1] - 2026-10-13

### Corrections de bugs & Affichage
- **Positionnement et visibilité de l'écran de chargement (`loaders.css`, `landing.css`)** :
  - Résolution du problème d'écran blanc où `#load-screen` était repoussé 500 px sous la ligne de flottaison à cause de l'héritage `position: relative` cumulé avec `#landing-screen`.
  - Application stricte de `position: absolute !important; inset: 0 !important; z-index: 100 !important;` sur `.load-screen` pour garantir un affichage plein écran parfaitement centré au premier plan.
  - Masquage explicite (`display: none !important;`) des écrans inactifs tels que `#landing-screen:not(.active)` pour éviter qu'ils n'occupent de la hauteur dans le flux vertical.
- **Routage et tolérance d'URL (`Router.js`)** :
  - Prise en charge universelle des hash routes : `#load`, `#/load`, `#/load/` sont désormais résolues automatiquement vers `/load`.
  - Sécurisation de l'initialisation de l'application dans `app.js` avec vérification de `document.readyState` pour déclencher immédiatement `startApp` si le DOM est déjà chargé.

### Cache & Cycle de vie
- Incrémentation du cache Service Worker en `citymaster-v17` dans `public/sw.js`.
- Synchronisation des chaînes de cache-busting `?v=2.7.1` dans `public/index.html` et mise à jour du badge `README.md`.

---

## [2.7.0] - 2026-10-13

### Nouveautés & Nouvelles fonctionnalités
- **Création de la page et route dédiée `/load` (`public/screens/load.html`, `src/app.js`, `src/views/GameView.js`)** :
  - Mise en place d'un écran de chargement dédié et isolé (`#load-screen`), conçu pour permettre le redesign et la mise au point visuelle du composant de chargement sans fermeture automatique.
  - Enregistrement de la route `/load` (et `/#/load`) au sein du routeur frontend SPA.
  - Accès strictement réservé par URL directe : aucun lien de navigation, menu burger ou bouton dans l'interface ne pointe vers cette route.
  - Masquage automatique de la barre de navigation principale (`#main-nav`) lors de l'accès à `/load` pour offrir une vue plein écran 100% consacrée au chargement, et restauration immédiate de la barre lors du retour sur toute autre route.

### Optimisations & Architecture
- **Robustesse du routeur (`src/Router.js`)** :
  - Normalisation des chemins avec tolérance pour les slashes finaux (ex: `/load/` pris en charge de manière identique à `/load`).
  - Sécurisation des accès aux variables globales navigateur (`window`, `document`, `history`) avec des gardes `typeof` pour garantir une compatibilité totale dans les environnements de tests Node.js et SSR.
- **Stylisation dédiée (`public/assets/styles/components/loaders.css`)** :
  - Ajout des règles CSS pour `.load-screen` et `.loading-message` avec centrage complet dans la fenêtre d'affichage (100dvh) et support fluide des modes clair et sombre.

### Tests unitaires & Non-régression
- **Suite de tests pour la route `/load` (`tests/load_route.test.js`)** :
  - Validation de l'existence et du balisage du template `load.html` (`#load-screen`, `.loader-container`, `.loader-spinner`, `#load-page-message`).
  - Test du déclenchement du gestionnaire de route sur `/load` et `/load/`.
  - Contrôle d'absence de liens publics résiduels vers `/load` dans `index.html` et les écrans existants.
- **Validation globale** : 30 tests unitaires validés avec succès (30/30).

### Cache & Cycle de vie
- Ajout de `/screens/load.html` dans les assets statiques mis en cache par le Service Worker.
- Incrémentation du cache Service Worker en `citymaster-v16` dans `public/sw.js`.
- Mise à jour des chaînes de cache-busting `?v=2.7.0` dans `public/index.html` et synchronisation du badge de version dans `README.md`.

---

## [2.6.0] - 2026-10-11

### Nouveautés & Ergonomie
- **Support complet des tronçons multiples (MultiLineString) dans l'édition cartographique (`AdminView.js`, `AdminController.js`)** :
  - Résolution définitive du problème de tracé sur les rues fractionnées en plusieurs segments disjoints (ex: *Avenue de Paris* / RD 2020) où les tronçons étaient auparavant aplatis en une seule ligne continue, créant des diagonales géantes à travers toute la ville.
  - L'éditeur gère désormais nativement des tableaux de segments indépendants (`#activeRouteSegments`). Chaque tronçon est représenté distinctement sur la carte sans liaison intempestive.
  - Ajout d'un bouton d'action « + Ajouter un tronçon » permettant d'étendre une rue avec des segments disjoints supplémentaires.
  - Sauvegarde et persistance au format standard GeoJSON `MultiLineString` (ou `LineString` si tronçon unique).
- **Gestion de la visibilité des noms de rues lors de l'édition (`admin.css`, `AdminView.js`, `AdminController.js`)** :
  - Amélioration de l'ergonomie des étiquettes permanentes de rues (`.route-tooltip`), qui masquaient le tracé et les poignées de manipulation sur les petites rues denses (ex: *Rue de l'Écureuil du Bois-Bourru*).
  - Ajout d'un bouton flottant d'action sur la carte permettant de masquer ou réafficher toutes les étiquettes de rues en un clic (`toggleRouteLabels()`).
  - En mode édition active, l'étiquette de la rue en cours d'édition est automatiquement masquée pour dégager la vue, et les autres étiquettes s'estompent à 35% d'opacité avec `pointer-events: none` pour ne pas gêner les clics.
- **Accès direct au mode clair / sombre sur smartphone (`index.html`, `navbar.css`, `NavbarView.js`)** :
  - Déplacement du bouton de bascule de thème dans la barre supérieure visible en permanence (`.navbar-header-actions`), à côté du bouton de menu burger, permettant aux utilisateurs mobiles (notamment ceux dont le téléphone est configuré en mode sombre par défaut) de passer en mode clair en 1 seul tap.
  - Ajout d'un bouton explicite avec texte dynamique (« Mode clair » / « Mode sombre ») dans le tiroir du menu mobile pour une clarté totale.
- **Guide d'installation cross-plateforme et démystification du terme PWA (`index.html`, `style.css`, `landing.html`, `fr.json`, `en.json`)** :
  - Remplacement du jargon technique « PWA » par des explications claires et directes : « application installable sans passer par les stores ».
  - Ajout d'une modale d'aide interactive (`#install-modal`) détaillant les étapes pas-à-pas pour iPhone / iPad (Safari : Partager ⎋ > Sur l'écran d'accueil 📲), Android (Chrome : Menu ⋮ > Installer l'application) et Ordinateur.
  - Intégration d'un bouton d'accès au guide sur la page d'accueil dans la section Multi-Plateforme.

### Corrections de bugs & Refactoring
- **Filtrage de difficulté solo (`GameController.js`)** : Priorisation des rues correspondant exactement à la difficulté demandée en mode solo avant de compléter avec les rues de secours, alignant le comportement solo sur les salons multijoueurs.
- **Nettoyage du balisage HTML (`index.html`)** : Suppression de blocs scripts redondants avant la modale d'installation.

### Tests unitaires & Non-régression
- **Nouveau test MultiLineString (`tests/city_modifications.test.js`)** : Validation de la persistance et de l'intégrité des géométries `MultiLineString` dans `AdminController.saveRoute`.
- **Validation i18n** : Maintien de la parité stricte des dictionnaires i18n (`fr.json` et `en.json`) pour les nouvelles clés.
- **Suite de tests** : 27 tests validés avec succès (27/27).

### Cache & Cycle de vie
- Incrémentation du cache Service Worker en `citymaster-v15` dans `public/sw.js`.
- Mise à jour des chaînes de cache-busting `?v=2.6.0` dans `public/index.html` et synchronisation du badge de version dans `README.md`.

---

## [2.5.3] - 2026-10-11

### Corrections de bugs & Prise en compte de la difficulté des routes dans le jeu
- **Prise en compte des surcharges de difficulté en jeu (`GameController.js`)** :
  - Intégration de `readDifficultyOverridesFile(cityKey)` au sein de `GameController.startGame` afin de charger les modifications manuelles de difficulté (table PostgreSQL `route_difficulties` et fichier `difficulty_overrides.json`).
  - Priorisation de la difficulté manuelle (`difficultyOverrides[nameLower]`, `difficultyOverrides[origNameLower]` ou `feature.properties.difficulty`) sur le calcul automatique géométrique/toponymique OSM dans la fonction `getStreetDifficulty`.
  - Préservation stricte de la surcharge manuelle lors de la déduplication et de l'agrégation des tronçons de rue (`uniqueStreetsMap`).
- **Synchronisation frontend & panneau d'administration (`AdminController.js`, `RouteDifficultyService.js`, `CityController.js`)** :
  - Correction de la résolution de difficulté dans l'administration pour inspecter `originalName` et la propriété `feature.properties.difficulty` des routes personnalisées.
  - Synchronisation de `CityController.getDifficulties` avec prise en charge du nom d'origine des routes renommées pour le comptage des difficultés disponibles.
  - Prise en compte de `props.difficulty` dans `RouteDifficultyService.getRouteDifficulty`.
- **Tests unitaires & Non-régression** :
  - Ajout d'un test validant la prise en compte immédiate d'une surcharge de difficulté dans une session de jeu générée par `GameController.startGame`.
  - Ajout d'un test validant `RouteDifficultyService.getRouteDifficulty` avec `feature.properties.difficulty`.
  - Suite de tests passée à 26 tests (26/26 validés).
- **Cycle de vie & Cache PWA** :
  - Incrémentation du cache Service Worker en `citymaster-v14` (`public/sw.js`).
  - Synchronisation des chaînes de cache-busting `?v=2.5.3` dans `public/index.html` et du badge de version dans `README.md`.

---

## [2.5.2] - 2026-10-08

### Ergonomie, Taille & Haute Visibilité du Bouton Google Sign-In
- **Mise à l'Échelle & Alignement Réactif (`AuthView.js`)** :
  - Rehaussement de la taille du bouton Google Identity Services (`renderButton`) de `"medium"` (32px) vers `"large"` (40px), s'harmonisant avec la hauteur standardisée des champs de saisie et du bouton de soumission.
  - Calcul dynamique et adaptatif de la largeur (`width`) calé sur la largeur effective du conteneur parent (`clientWidth`, borné entre 200px et 400px), assurant un alignement parfait avec le formulaire sur desktop comme sur mobile.
  - Ajout d'un observateur de redimensionnement de fenêtre (`window.resize` avec debounce 150 ms) pour recalculer la largeur du bouton lors d'un changement de taille d'écran ou d'orientation mobile.
- **Haute Visibilité & Contraste Mode Sombre (`auth.css` & `AuthView.js`)** :
  - Abandon du thème `"filled_black"` (qui se fondait sans bordure dans l'arrière-plan de carte sombre `#1a1f2c`) au profit du thème officiel haute visibilité `"outline"` recommandé par les directives de style Google sur les arrière-plans sombres.
  - Retrait du forçage `color-scheme: light;` sur `.google-auth-container` pour respecter l'héritage du thème de l'application.
  - Stylisation avancée de l'iframe Google : coins arrondis (`border-radius: 8px`), ombre portée en mode sombre (`box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5)`), micro-liseré lumineux (`0 0 0 1px rgba(255, 255, 255, 0.18)`) et illumination au survol.
- **Cache & Cycle de Vie PWA** :
  - Incrémentation du cache Service Worker en `citymaster-v13` (`public/sw.js`) pour forcer le rafraîchissement des assets chez les clients.
  - Mise à jour des chaînes de cache-busting `?v=2.5.2` dans `public/index.html` et synchronisation du badge de version dans `README.md`.

---

## [2.5.1] - 2026-10-07

### Automatisation du Versioning & Directives de Release Agent
- **Automatisation Workspace (`GEMINI.md`, `AGENTS.md`, `.agents/rules/versioning.md`)** : Configuration des règles impératives guidant l'assistant IA pour imposer l'incrément SemVer systématique, la mise à jour des en-têtes d'assets (`public/index.html`, `public/sw.js`), la complétion du journal `CHANGELOG.md` et l'exécution des tests unitaires (`npm test`) à chaque intervention.
- **Script Automatisé d'Incrément (`scripts/bump-version.js` & `npm run version:bump`)** : Utilitaire Node.js permettant de mettre à jour de manière synchronisée et atomique `package.json`, le cache Service Worker (`public/sw.js`), les versions d'icônes/manifeste (`public/index.html`), le badge `README.md` et d'initialiser la section correspondante dans `CHANGELOG.md`.

---

## [2.5.0] - 2026-10-07

### Performance Réseau, Optimisations API & Architecture Sécurisée
- **Cache Local Haute Performance (IndexedDB & `StorageService`)** : Introduction de la persistance locale IndexedDB sans contrainte de quota de 5 Mo pour les fichiers GeoJSON de communes. Les parties rejouées démarrent instantanément (0 ms de latence réseau, 0 octet consommé).
- **Suppression du Cache-Busting & En-têtes HTTP de Longue Durée** : Retrait du paramètre systématique `?t=${Date.now()}` sur le chargement des communes et des fichiers de personnalisation. Configuration d'en-têtes HTTP `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` sur `/assets/data/*.json`.
- **Synchronisation Salons Temps Réel (Server-Sent Events & Polling Conditionnel ETag)** :
  - Endpoint persistant SSE `/api/rooms/:code/stream` pour la diffusion immédiate (< 50 ms) des événements de salon (connexion, démarrage, score, reset) sans polling continu.
  - Bascule transparente côté client vers un polling conditionnel léger : calcul d'un hash MD5 de l'état du salon renvoyant `{ changed: false }` (~30 octets) au lieu de répéter la charge utile complète toutes les 2 secondes.
  - Authentification JWT supportée via query string pour les flux `EventSource`.
- **Protection des Quotas & Caches Serveur OpenStreetMap** :
  - **Overpass LRU Cache** : Cache mémoire de 24h basé sur une empreinte SHA-256 des requêtes avec éviction LRU (max 200 entrées) pour soulager les serveurs publics OSM.
  - **Nominatim Server Cache** : Cache mémoire d'une heure sur les requêtes de géocodage évitant tout bannissement d'IP pour dépassement du quota de 1 req/sec.
  - **Mémoïsation Client** : Cache dictionnaire local (`Map`) sur les saisies d'autocomplétion des communes dans l'administration, la création de salons et le jeu.
- **Sécurisation & Cloisonnement Backend** :
  - Verrouillage de l'accès public au répertoire `/src/backend` dans `server.js`.
  - Migration sécurisée de `users.json` hors du dossier public statique vers `config/users.json`.
  - Élagage des erreurs 500 et suppression des logs d'authentification bloquants dans `/tmp`.
- **Refonte des I/O & Mémoire Serveur** :
  - Remplacement des lectures de fichiers bloquantes synchrones (`readFileSync`) par `fs/promises`.
  - Suppression de la lecture lourde des GeoJSON (347 Mo pour Lyon) dans le contrôleur de salons en exploitant les métadonnées légères de `City.getAll()`.
  - Mise en cache mémoire de la liste des communes avec invalidation dynamique.
  - Rehaussement du rate limiter global pour les connexions simultanées en réseau local.
- **Améliorations PWA & Expérience Hors-Ligne** :
  - Page de repli hors-ligne (`offline.html`) avec interface soignée et détection en temps réel du retour de la connectivité.
  - Bouton d'installation PWA contextuel dans la barre de navigation (`#pwa-install-btn`).
  - Cache Service Worker incrémenté en `citymaster-v12`.
- **Nettoyage "Clean Code" Intégral** :
  - Éradication de tous les imports inutilisés et variables mortes dans `RoomController`, `GameController`, `GameView`, `AdminController`, `scores.routes.js`, `User.js` et `RoomView`.
  - Factorisation de la navigation et harmonisation uniforme du style des chaînes (`'`).
- **Suite de Tests d'Intégration Étendue (24/24 tests validés)** :
  - Tests complets pour `AuthController` (politique de mot de passe, format des pseudos, validation JWT).
  - Tests complets pour `RoomController` (génération aléatoire cryptographique 6 caractères, PRNG mulberry32, expiration automatique 1h/24h/7j).
  - Tests complets pour `ScoreController` (déduplication MAX score, validation et rejet des scores invalides).

---

## [2.4.0] - 2026-10-07

### Authentification Google GIS, UX Salons & Architecture Modèle
- **Bouton Google Sign-In Dynamique & Thématique** : Intégration complète de Google Identity Services avec gestion réactive du mode sombre et clair via un `MutationObserver` (`theme: "filled_black"` en mode sombre, `theme: "outline"` avec bordure nette et texte foncé en mode clair).
- **Suppression des Conflits de Rendu Google** : Élimination du cadre blanc artificiel grâce à `color-scheme: light` et suppression des styles CSS intrusifs altérant l'aspect natif du composant Google.
- **Espacement & Ergonomie des Formulaires** : Ajustement des marges entre le bouton Google et le séparateur "OU / OR", élimination des chevauchements d'éléments sur mobile et bureau.
- **Feedback Immédiat de Recherche de Ville** : Affichage instantané dès la première frappe de l'animation à trois points pulsants (`.search-loader`) dans les barres de recherche de communes (Salons, Jeu et Administration) avec debounce optimisé à 400ms.
- **Feedback Visuel de Copie de Salon** : Animation et infobulle de confirmation (`.copy-feedback`) lors de la copie du code de salon ou du lien d'invitation (`.share-box`, `.code-box`).
- **Bouton d'Action Primaire dans les Salons** : Promotion du bouton "Rejoindre" en style primaire (`btn-primary`) pour maximiser la visibilité et l'ergonomie.
- **Modèle de Données City & Isolation Git** : Création du modèle asynchrone `City` (`City.getAll()`, `City.findBySlug()`) et déport des communes dynamiques dans `config/custom_cities.json` (ignoré par Git) afin d'éviter tout conflit de fusion (`git pull`) lors des déploiements.
- **Dédoublonnage & Mise en Valeur du Classement** : Agrégation stricte des scores par joueur via `MAX(score)`, mise en surbrillance de l'utilisateur actif (`.current-user-row`) et fiabilisation du stockage mémoire de secours.
- **Fluidité de Transition d'Écran** : Remplacement de la transformation résiduelle sur `.screen.active` par `transform: none` pour permettre au dégradé d'arrière-plan de s'étendre naturellement sous la barre de navigation transparente.
- **Balises Meta Theme-Color Dynamiques** : Synchronisation de la couleur de la barre d'état du navigateur mobile (`theme-color`) avec le mode clair/sombre.
- **Nettoyage et Standardisation de la Racine** : Suppression de tous les scripts de patch et fichiers temporaires à la racine du projet, et mise à jour stricte du fichier `.gitignore`.
- **Mise à Jour du Cache PWA** : Incrément de la version du Service Worker (`citymaster-v10`) et synchronisation cohérente du thème dans le `localStorage`.

---

## [2.3.0] - 2026-10-05

### Refonte Stylistique Neumorphique, Tokens CSS & Internationalisation Globale (i18n)
- **Éradication des Couleurs Brutes & Tokens Sémantiques** : Remplacement systématique de l'ensemble des couleurs hexadécimales par des variables CSS (`var(--color-...)`), introduction des teintes dérivées claires (`--color-danger-light`, `--color-success-light`, `--color-warning-light`, `--color-accent-light`) pour un contraste optimal en thème sombre et clair.
- **Harmonisation Neumorphique Globale** : Uniformisation des ombres portées, bordures et effets de relief (`box-shadow`, `inset`) sur l'ensemble des composants (boutons, cartes, badges, formulaires, messages flash, navigation et profil).
- **Généralisation de l'i18n sur Toutes les Vues** : Traduction intégrale (FR/EN) intégrée dans `AdminView`, `MapView`, `RoomView`, `GameView`, `CertificateView`, `AuthView` et `FlashMessageService`.
- **Attributs Placeholder Traduisibles** : Support dynamique de la traduction des placeholders de saisie via l'attribut `data-i18n-placeholder` dans `I18nService`.
- **Suite Complète de Tests Automatisés i18n (`tests/i18n.test.js`)** :
  - Vérification automatisée de la parité stricte clé par clé entre `fr.json` et `en.json`.
  - Contrôle systématique que tous les attributs `data-i18n*` des fichiers HTML existent dans les dictionnaires.
  - Détection automatique d'éventuelles clés orphelines ou manquantes appelées dans le code JavaScript (`t(...)`).
- **Responsive Layout & Grilles de Configuration** : Révision complète de la grille de sélection des paramètres de jeu (`setup.html` / `setup.css`) et adaptation tactile sur petits écrans.

---

## [2.2.0] - 2026-09-27

### Moteur de Difficulté des Voies, Couche API Centralisée & Sécurité Administrateur
- **Calcul Dynamique de la Difficulté des Voies (`RouteDifficultyService`)** : Algorithme d'analyse géographique basé sur la longueur cumulée et la typologie OpenStreetMap des voies (`primary`, `secondary`, `residential`, `living_street`, etc.) par rapport au centroïde de la commune pour classifier chaque voie en *Facile, Moyen ou Difficile*.
- **Surcharge des Difficultés dans l'Administration** : Interface et routes dédiées (`/api/admin/cities/:slug/difficulty`) permettant de personnaliser le niveau de difficulté attribué à chaque voie.
- **Centralisation des Requêtes HTTP (`ApiService`)** : Service unifié gérant les verbes HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), l'injection transparente du token JWT et la gestion centralisée des erreurs de session.
- **Renforcement de la Persistance Administrateur** : Middleware `requireAdmin` sécurisé avec vérification croisée du JWT et de la persistance en base PostgreSQL (`User.setAdminStatus`, `User.findByUsername`).
- **Script d'Attribution de Rôle (`scripts/make-admin.js`)** : Outil CLI pour attribuer les privilèges administrateur de manière sécurisée et scriptable.
- **Suite de Tests d'Intégration** : Validation automatisée de la persistance des droits administrateurs (`tests/admin_persistence.test.js`) avec le runner natif `node:test`.

---

## [2.1.0] - 2026-09-17

### Fusion des Tronçons de Voies & Cycle des Sessions de Jeu
- **Tests Automatisés de Fusion Spatiale (`tests/city_modifications.test.js`)** : Tests validant la fusion Turf.js des tronçons de rues OSM, la gestion des renommages, l'ajout de voies personnalisées et la suppression sans doublons.
- **Cycle de Vie et Sérialisation des Sessions (`GameSession.js`)** : Préservation du prompt courant et de l'index de manche lors des phases de feedback (`nextPrompt`), sérialisation rétrocompatible et tests unitaires (`tests/game_session.test.js`).
- **Refactoring & Optimisation de MapView** : Simplification des méthodes de rendu cartographique, suppression des redondances et meilleure gestion des couches de tracés.

---

## [2.0.0] - 2026-09-13

### Refonte Graphique Majeure, PWA & Support Bilingue (i18n)
- **Nouvelle Identité Visuelle Neumorphique** : Refonte stylistique complète avec tokens CSS unifiés, ombres douces, cartes flottantes et prise en charge native du thème sombre/clair.
- **Écran d'Authentification Interactif & Mascottes** : Introduction des mascottes vectorielles interactives (Kiko et le chat gris) dotées d'une animation physique de queue dynamique et réagissant aux interactions de l'utilisateur.
- **Internationalisation Initiale (i18n)** : Architecture bilingue français/anglais avec système de chargement dynamique des dictionnaires (`I18nService`), persistance du choix et bascule instantanée.
- **Application Web Progressive (PWA)** : Support hors-ligne via Service Worker, mise en cache des actifs statiques et dialogue d'installation sur mobile et bureau.
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
