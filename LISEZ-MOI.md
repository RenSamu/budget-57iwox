# Budget — V1

Application web installable (PWA) : budget prévisionnel lissé sur 12 mois + saisie quotidienne, pensée pour la Suisse (3e pilier, impôts, LAMal, assurances, animaux).
Les données restent **uniquement sur ton appareil** (stockage du navigateur). Aucun compte, aucun serveur.

## Mise en ligne automatique sur GitHub Pages (recommandé)
1. Installe git et le CLI GitHub : `winget install Git.Git` et `winget install GitHub.cli`, puis rouvre PowerShell.
2. Dans le dossier de l'app : `.\deploy.ps1` (Windows) ou `./deploy.sh` (Linux/Mac).
3. Première fois : le script ouvre la connexion GitHub, crée un dépôt public au nom aléatoire (`budget-xxxxxx`), envoie le code et active Pages.
4. Il affiche l'adresse finale. Pour mettre à jour plus tard, relance simplement le script.

Notes : le dépôt est public (obligatoire pour Pages en gratuit) mais ne contient aucune donnée personnelle ; `deploy.*` et tes exports `budget-*.json` ne sont jamais envoyés (voir `.gitignore`). Le script utilise l'adresse « noreply » de GitHub pour ne pas exposer ton e-mail.

## Autres options d'hébergement (5 minutes, gratuit)

Une PWA doit être servie en HTTPS pour s'installer sur le téléphone.

**Option la plus simple : Netlify Drop**
1. Va sur app.netlify.com/drop
2. Glisse-y le dossier `budget-app` décompressé
3. Tu obtiens une adresse `https://…netlify.app`

**Option GitHub Pages** : crée un dépôt, envoie-y ces fichiers, active Pages dans les réglages du dépôt.

## Installer sur Android
Ouvre l'adresse dans Chrome, menu ⋮ → « Installer l'application » (ou « Ajouter à l'écran d'accueil »).

## Tester sur ordinateur
Dans le dossier : `python3 -m http.server 8080`, puis ouvre http://localhost:8080

## Contenu de la V1
- Accueil : reste à vivre du mois, à venir, mouvements récents, navigation par mois
- Saisie rapide : dépense ou revenu, clavier numérique, catégories, date, note
- Prévisionnel : charges annuelles divisées par 12, charges fixes mensuelles, modèle Valais
- Suivi du 3e pilier (3a) avec plafond modifiable
- Export / import de sauvegarde (fichier JSON)

## Sécurité
- L'app est publique mais ne contient aucune donnée : tout reste dans ton navigateur.
- `noindex` + `robots.txt` : les moteurs de recherche n'indexent pas la page.
- `_headers` (Netlify) : CSP stricte, anti-framing, HSTS, etc. Sur GitHub Pages ce fichier est ignoré, mais la CSP de base est aussi dans `index.html`.
- **Active la double authentification** sur ton compte d'hébergement : c'est le vrai point sensible.
- Choisis une adresse non devinable et ne la partage pas.

## Points d'attention
- **Sauvegarde** : vider les données du navigateur ou changer de téléphone efface tout. Exporte régulièrement (Réglages).
- **Plafond 3a** : la valeur proposée (7’258 CHF) est à vérifier chaque année selon ta situation.
- **Mise à jour de l'app** : après modification d'un fichier, change `CACHE` dans `sw.js` (ex. `budget-v3`).

## Prochaine phase
Import CSV bancaire avec catégorisation automatique, puis simulateur de franchise LAMal et rappels.
