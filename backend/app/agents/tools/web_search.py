from __future__ import annotations

from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import BaseTool, tool
from langchain_tavily import TavilySearch
from pydantic import BaseModel, Field

from app.agents.model import build_chat_model
from app.agents.runtime_context import format_runtime_context_block, get_runtime_context
from app.config import Settings


class SearchPlan(BaseModel):
    """Generic search rewrite — no domain-specific examples required."""

    user_intent: str = Field(description="What the user is trying to learn or decide.")
    desired_answer_shape: str = Field(
        description="Preferred answer shape (fact, comparison, how-to, list, etc.)."
    )
    search_query: str = Field(
        description="Concrete web search query with absolute time/place/version constraints when relevant."
    )


_PLANNER_SYSTEM = """\
You are a search query rewriter. Your only job is to output a web search query string.

Given the user question and authoritative runtime context, fill SearchPlan fields.

Rules (apply generally — do not rely on memorized situation examples):
1. Infer the real information need behind the question.
2. Resolve relative time expressions using runtime context into absolute dates/ranges inside search_query.
3. Add implied constraints (place, language/locale, product/version, comparison axis) when they improve retrieval.
4. Prefer a specific query over a bag of vague keywords.
5. search_query must be a search engine query, NEVER a natural-language answer to the user.
6. Do not invent facts beyond rewriting constraints from the question + runtime context.
"""


def _build_search_plan(user_question: str, search_goal: str = "") -> SearchPlan:
    planner = build_chat_model().with_structured_output(SearchPlan)
    prompt = [
        SystemMessage(content=f"{_PLANNER_SYSTEM}\n\n{format_runtime_context_block()}"),
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
def intent_aware_web_search(user_question: str, search_goal: str = "") -> dict[str, Any]:
    """Search the live web after rewriting the question into a concrete query.

    Use for current events, prices, weather, schedules, versions, news, or any claim
    that may have changed after training. Pass the user's question in natural language;
    this tool resolves relative time and other underspecified constraints automatically.
    """
    settings = Settings()
    api_key = settings.tavily_api_key.strip()
    if not api_key:
        return {
            "error": "Tavily API key is not configured.",
            "results": [],
        }

    runtime = get_runtime_context()
    plan = _build_search_plan(user_question=user_question, search_goal=search_goal)
    tavily = TavilySearch(
        max_results=settings.tavily_max_results,
        tavily_api_key=api_key,
        search_depth="advanced",
        include_answer=True,
    )
    results = _invoke_tavily_with_fallback(tavily, plan.search_query)
    return {
        "runtime": runtime,
        "user_intent": plan.user_intent,
        "desired_answer_shape": plan.desired_answer_shape,
        "search_query": plan.search_query,
        "results": results,
    }


def get_web_search_tools() -> list[BaseTool]:
    if not Settings().tavily_api_key.strip():
        return []
    return [intent_aware_web_search]
