# Atelier

Client lourd de gestion de projet, outil décisionnel et de simulation, augmenté par l'IA.

---

## démarrer :

terminal 1
```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

terminal 2

````bash
npm run dev:frontend
# ou pour le client lourd Tauri :
npm run tauri dev
```

## Concept

Atelier est un environnement de travail intelligent destiné aux consultants et décideurs. Il centralise les fichiers, données et connaissances d'un projet, orchestre des agents IA spécialisés, et produit automatiquement des analyses, scénarios et rapports contextualisés.

---

## Fonctionnalités

### Cœur du produit
- Connecter n'importe quel modèle d'IA (OpenAI, Anthropic, modèles locaux via Ollama, etc.)
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

---

## Workflow utilisateur

1. L'utilisateur installe Atelier et renseigne son profil (métier, besoins) — modifiable à tout moment.
2. Il fournit les URIs de ses projets précédents : Atelier les indexe pour comprendre son contexte, ses méthodes et les besoins de ses clients.
3. Atelier indexe les projets précédents (RAG) pour alimenter les agents.
4. L'utilisateur commence un nouveau projet en ajoutant fichiers, liens et informations — Atelier crée automatiquement le contexte de travail.

---

## Stack technique

### Desktop
| Couche | Technologie | Justification |
|---|---|---|
| Framework desktop | **Tauri** (Rust) | Plus léger et sécurisé qu'Electron, natif Windows/macOS/Linux |
| UI | **React + TypeScript** | Écosystème riche, typage fort |
| Composants | **shadcn/ui + TailwindCSS** | Moderne, personnalisable |

### Backend local embarqué
| Couche | Technologie | Justification |
|---|---|---|
| Runtime | **Python 3.12+** | Meilleur écosystème IA/ML |
| API locale | **FastAPI** | Léger, async, auto-documentation |
| ORM + BDD | **SQLAlchemy + SQLite** | Stockage local structuré, sans serveur |

### IA & Agents
| Couche | Technologie | Justification |
|---|---|---|
| Abstraction modèles | **LiteLLM** | Compatible 100+ modèles (OpenAI, Anthropic, Ollama…) |
| Orchestration agents | **LangGraph** | Agents complexes avec état, flexible |
| Modèles locaux | **Ollama** | Privacy, mode offline |
| Embeddings locaux | **sentence-transformers** | Indexation sans dépendance externe |

### Stockage & recherche
| Couche | Technologie | Justification |
|---|---|---|
| Base vectorielle (RAG) | **LanceDB** | Embarqué, sans serveur, très performant |
| Cache | **diskcache** | Évite la re-indexation inutile |

### Traitement de documents
| Format | Bibliothèque |
|---|---|
| PDF | PyMuPDF |
| Word | python-docx |
| Format universel | Unstructured |
| Images | Pillow |
| Audio → texte | openai-whisper |

### Intégrations externes
| Service | Technologie |
|---|---|
| Outlook, SharePoint, Teams | Microsoft Graph API |
| Drive, Gmail | Google API Python |
| Recherche web agents | Tavily / SerpAPI |

### Distribution
| Étape | Technologie |
|---|---|
| Bundle backend Python | PyInstaller |
| Installeur natif | Tauri |

---

## Architecture

```
React + Tauri UI
       │
  FastAPI (local)
       │
  ┌────┴────────────────┐
  │                     │
LiteLLM            LangGraph (agents)
  │                     │
  ├── OpenAI/Anthropic  ├── Unstructured / PyMuPDF
  └── Ollama (local)    ├── Microsoft Graph / Google API
                        ├── Tavily (web search)
                        └── LanceDB (RAG)
                        
SQLite (projets, décisions, historique)
LanceDB (index vectoriel)
```