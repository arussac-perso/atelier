"""
Agent tools — callable by the LangGraph agent during analysis.
"""
from typing import List, Dict, Any
from langchain_core.tools import tool

# These are injected at runtime via closure (see graph.py)
_lancedb_path: str = ""
_project_id: int = 0


def make_tools(project_id: int, lancedb_path: str) -> List:
    """Factory — creates tool instances bound to a specific project."""

    @tool
    def search_project_files(query: str) -> str:
        """
        Search the project's indexed files using semantic similarity.
        Use this to find relevant excerpts from documents in the project.
        Args:
            query: The search query describing what you are looking for.
        """
        from ..services.indexing_service import search
        results = search(project_id, query, lancedb_path, limit=5)
        if not results:
            return "Aucun résultat trouvé dans les fichiers du projet."
        lines = []
        for r in results:
            lines.append(f"[{r['filename']}]\n{r['text']}\n")
        return "\n---\n".join(lines)

    @tool
    def search_web(query: str) -> str:
        """
        Search the web for additional information.
        Use this when you need recent data or information not available in project files.
        Args:
            query: The search query.
        """
        try:
            from tavily import TavilyClient
            import os
            api_key = os.environ.get("TAVILY_API_KEY", "")
            if not api_key:
                return "Recherche web non disponible : clé API Tavily non configurée."
            client = TavilyClient(api_key=api_key)
            response = client.search(query=query, max_results=3)
            results = response.get("results", [])
            lines = [f"[{r['title']}]\n{r['content']}\nURL: {r['url']}" for r in results]
            return "\n---\n".join(lines) if lines else "Aucun résultat web."
        except ImportError:
            return "Recherche web non disponible : installez tavily-python."
        except Exception as e:
            return f"Erreur lors de la recherche web : {e}"

    return [search_project_files, search_web]
