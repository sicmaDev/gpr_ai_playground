# GPR AI Playground

Interface web de test et démonstration du pipeline IA de traitement des plaintes clients. Permet de simuler en temps réel l'analyse NLP et la génération de solutions via le micro-service `gpr_ai_service`.

---

## Fonctionnalités

- Saisie d'un texte de plainte client
- **Analyse NLP** : sentiment, niveau d'urgence, mots-clés détectés, résumé automatique
- **Génération RAG** : affichage des plaintes historiques similaires (FAISS) et d'une solution proposée par le LLM (Ollama)
- Thème clair / sombre avec mémorisation de la préférence
- Interface responsive (desktop et mobile)

---

## Prérequis

- Le micro-service **`gpr_ai_service`** doit être démarré et accessible sur `http://localhost:8001`
  - Voir le [README de gpr_ai_service](../gpr_ai_service/README.md) pour l'installation et le lancement

Aucun outil de build, aucune dépendance npm. C'est du HTML/CSS/JS pur.

---

## Lancement

### Option 1 — Ouverture directe (sans serveur)

Ouvrir `index.html` directement dans un navigateur.

> Attention : certains navigateurs bloquent les requêtes `fetch` vers `localhost` depuis un fichier local (`file://`). Si les appels API échouent, utiliser l'option 2.

### Option 2 — Serveur local (recommandé)

Avec Python :

```bash
cd gpr_ai_playground
python -m http.server 3000
```

Puis ouvrir `http://localhost:3000` dans le navigateur.

Avec Node.js (si disponible) :

```bash
npx serve .
```

---

## Utilisation

1. Démarrer `gpr_ai_service` (port 8001)
2. Ouvrir le Playground dans le navigateur
3. Saisir un texte de plainte dans la zone de texte
4. Choisir une action :
   - **"Analyser la plainte"** → appelle `POST /analyze/` et affiche le sentiment, l'urgence, les mots-clés et le résumé
   - **"Générer une solution (RAG)"** → appelle `POST /search/` et affiche la solution générée par le LLM ainsi que les sources historiques similaires

---

## Structure du projet

```
gpr_ai_playground/
├── index.html    # Structure de la page et composants UI
├── style.css     # Styles (glassmorphism, thème clair/sombre, responsive)
└── app.js        # Logique applicative et appels API
```

---

## Architecture des appels API

Le Playground communique avec `gpr_ai_service` sur `http://localhost:8001`.

| Action | Méthode | Endpoint | Paramètre envoyé |
|---|---|---|---|
| Analyser | POST | `/analyze/` | `{ "texte": "..." }` |
| Générer une solution | POST | `/search/` | `{ "texte_actuel": "..." }` |

---

## Codes couleur des niveaux d'urgence

| Niveau | Couleur |
|---|---|
| `GRAVE` | Rouge |
| `MOYEN` | Orange |
| `MINEUR` | Vert |

---

## Notes pour le développement

- L'URL du backend est codée en dur dans `app.js` : `http://localhost:8001`. La modifier si le service tourne sur un autre port ou hôte.
- Pas de framework JS : vanilla uniquement, pas de `node_modules` à installer.
- Le thème choisi par l'utilisateur est persisté dans `localStorage`.
