# selyassine.github.io

Portfolio de **Yassine Selmi** : actuariat, data science et IA. En ligne sur [selyassine.github.io](https://selyassine.github.io/).

- `index.html` : la page (présentation, projets, laboratoire, méthode, parcours, compétences, certifications, contact)
- `en/index.html` : la même page en anglais ; le script détecte la langue de la page et adapte ses textes et ses formats de nombres
- `assets/style.css` : styles (bleu nuit et laiton, Spectral et Public Sans)
- `assets/main.js` : tout ce qui se calcule dans le navigateur
  - la simulation d'ouverture : 5 000 trajectoires d'une marche aléatoire avec dérive ;
  - le laboratoire : triangle Chain Ladder modifiable, tranche XL sous loi de Pareto généralisée, rente et choc de longévité, provision IFRS 9 en stade 1 et 2 ;
  - le filtre des projets par domaine ;
  - les galeries de projets (une miniature remplace la grande image) ;
  - l'assistant, qui cherche par mots-clés dans des réponses préparées (aucun modèle de langage, aucun appel réseau) ;
  - le formulaire, qui prépare un e-mail.
- `assets/img/` : portrait et image de partage
- `assets/img/projets/` : trois captures par projet (`projet-1.webp` à `projet-3.webp`) et leurs miniatures (`-mini.webp`), au format WebP
- `assets/CV_Yassine_Selmi.pdf` : le CV

Site statique sans dépendance ni étape de construction : GitHub Pages publie la branche `main` telle quelle.
