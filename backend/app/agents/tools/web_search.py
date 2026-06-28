from __future__ import annotations

from langchain_core.tools import BaseTool
from langchain_tavily import TavilySearch

from app.config import Settings


def get_web_search_tools() -> list[BaseTool]:
    settings = Settings()
    api_key = settings.tavily_api_key.strip()
    if not api_key:
        return []

    return [
        TavilySearch(
            max_results=settings.tavily_max_results,
            tavily_api_key=api_key,
            search_depth="basic",
            include_answer=True,
        )
    ]
