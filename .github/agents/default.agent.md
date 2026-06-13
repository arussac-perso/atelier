---
description: 'spécialiste du projet atelier'
name: 'default'
---

## project

Création de "atelier", un client lourd qui sevirait à la gestion de projet et comme outil décisionnel et outil de simulation, avec de l'IA. 

## fonctionnalités

### Cœur du produit
- Connecter n'importe quel modèle d'IA (OpenAI, Anthropic, Ollama, etc.)
- Importer tout type de fichier : texte, image, audio, vidéo, 3D, coordonnées géographiques, liens SharePoint, mails, etc.
- Connexion aux sources externes : Outlook, SharePoint, Google Drive, Gmail, APIs REST, bases de données
- Créer automatiquement des propositions de scénario, de décision ou de rapport à partir des fichiers importés
- Établir un contexte de travail personnalisé selon le profil métier de l'utilisateur
- Gérer plusieurs projets en parallèle, chacun avec son propre contexte isolé
- Tableau de bord permanent : informations disponibles, manquantes, décisions prises/à prendre, propositions des agents
- Suivi de la consommation de tokens par projet, avec plafonds configurables

### Agents IA
- Dialogue avec les agents pour obtenir avis, analyses, propositions (historique des conversations)
- Les agents peuvent rechercher dans les fichiers du projet, sur internet, ou dans les projets précédents
- Génération de mails, rapports, présentations, documents de travail par les agents
- Notifications/alertes quand un agent détecte une information critique ou un manque

### Gestion des connaissances
- Indexation et recherche sémantique unifiée sur tous les projets et fichiers
- Graphe de connaissances visuel (entités, relations, décisions)
- Tagging et catégorisation automatique des fichiers et décisions
- Versionning des scénarios et décisions (traçabilité des choix)

### Collaboration & gouvernance
- Partage de projet entre utilisateurs avec rôles (lecteur, contributeur, admin)
- Audit trail complet : qui a pris quelle décision, quand, sur quelle base
- Contrôles de confidentialité : définir ce qui peut/ne peut pas être envoyé à un modèle externe

### Templates & productivité
- Templates de projet par métier (agents, contexte et documents pré-configurés)
- Mode hors-ligne avec modèles locaux pour les données sensibles
- Chiffrement local des projets
- API/Webhooks pour s'intégrer dans d'autres outils métier


## workflow

1. L'utilisateur installe Atelier. Il renseigne son profil, en expliquant son métier, ses besoins dans une fenêtre de configuration (cela doit être modifiable à volonté).
2. L'utilisateur donne un lien, une URI de ses projets précédents, qui serviront à Atelier pour comprendre le contexte de travail, les méthodes et choix de l'utilisateurs ainsi que les besoins de l'utilisateur (et des clients).
3. Atelier exécute un script pour permettre une indexation des projets précédents et faciliter la recherche d'informations pour les agents d'IA.
4. L'utilisateur peut commencer à ajouter des fichiers, des liens et des informations du projet sur lequel il travaille. Atelier va automatiquement créer un contexte de travail.


## stack technique

### Desktop
- Framework : **Tauri** (Rust) + **React + TypeScript**
- Composants UI : **shadcn/ui + TailwindCSS**

### Backend local
- Runtime : **Python 3.12+**
- API : **FastAPI**
- BDD : **SQLAlchemy + SQLite**

### IA & Agents
- Abstraction modèles : **LiteLLM** (OpenAI, Anthropic, Ollama, 100+ modèles)
- Orchestration agents : **LangGraph**
- Modèles locaux : **Ollama**
- Embeddings : **sentence-transformers**

### Stockage & recherche
- Base vectorielle RAG : **LanceDB** (embarqué, sans serveur)
- Cache : **diskcache**

### Traitement de documents
- PDF : PyMuPDF | Word : python-docx | Universel : Unstructured | Images : Pillow | Audio : openai-whisper

### Intégrations externes
- Microsoft Graph API (Outlook, SharePoint, Teams)
- Google API Python (Drive, Gmail)
- Tavily / SerpAPI (recherche web pour agents)

### Distribution
- PyInstaller (bundle backend) + Tauri (installeur natif Windows/macOS/Linux)
