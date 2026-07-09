from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import BaseTool, tool
from langchain_tavily import TavilySearch
from pydantic import BaseModel, Field

from app.agents.model import build_chat_model
from app.config import Settings


class SearchPlan(BaseModel):
    """Intent-aware web search plan generated from user question."""

    user_intent: str = Field(description="What the user really wants to achieve.")
    desired_answer_shape: str = Field(description="Preferred response shape and depth.")
    search_query: str = Field(description="Search query optimized for web retrieval.")


def _build_search_plan(user_question: str, search_goal: str) -> SearchPlan:
    planner = build_chat_model().with_structured_output(SearchPlan)
    prompt = [
        SystemMessage(
            content=(
                "You are a search strategist. Infer user intent and craft a high-signal web query.\n"
                "Rules:\n"
                "1) Infer what the user is truly trying to decide/learn.\n"
                "2) Prefer concrete constraints in query (time range, region, product/version, comparison axis).\n"
                "3) Avoid generic short keyword-only queries.\n"
                "4) Keep the final query concise but specific enough for reliable search results."
            )
        ),
        HumanMessage(
            content=(
                f"User question: {user_question}\n"
                f"Optional search goal: {search_goal or 'not provided'}\n"
                "Return intent, desired answer shape, and optimized search query."
            )
        ),
    ]
    return planner.invoke(prompt)


def _invoke_tavily_with_fallback(tavily: TavilySearch, query: str):
    try:
        return tavily.invoke({"query": query})
    except Exception:
        return tavily.invoke(query)


@tool("intent_aware_web_search")
def intent_aware_web_search(user_question: str, search_goal: str = "") -> dict:
    """Use this tool for up-to-date information. It infers user intent and rewrites the query before web search."""
    settings = Settings()
    api_key = settings.tavily_api_key.strip()
    if not api_key:
        return {
            "error": "Tavily API key is not configured.",
            "results": [],
        }

    plan = _build_search_plan(user_question=user_question, search_goal=search_goal)
    tavily = TavilySearch(
        max_results=settings.tavily_max_results,
        tavily_api_key=api_key,
        search_depth="advanced",
        include_answer=True,
    )
    results = _invoke_tavily_with_fallback(tavily, plan.search_query)
    return {
        "user_intent": plan.user_intent,
        "desired_answer_shape": plan.desired_answer_shape,
        "search_query": plan.search_query,
        "results": results,
    }


def get_web_search_tools() -> list[BaseTool]:
    settings = Settings()
    api_key = settings.tavily_api_key.strip()
    if not api_key:
        return []

    return [intent_aware_web_search]
