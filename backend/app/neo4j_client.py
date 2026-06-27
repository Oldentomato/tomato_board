from __future__ import annotations

import logging
from typing import Optional

from neo4j import Driver, GraphDatabase

from app.config import get_settings

logger = logging.getLogger(__name__)

_driver: Optional[Driver] = None
_use_neo4j: bool = False


def neo4j_enabled() -> bool:
    return _use_neo4j


def init_neo4j() -> None:
    global _driver, _use_neo4j
    settings = get_settings()
    if not settings.neo4j_uri.strip():
        logger.info("NEO4J_URI not set — chat will use in-memory storage.")
        _use_neo4j = False
        return

    try:
        _driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        _driver.verify_connectivity()
        _ensure_constraints()
        _use_neo4j = True
        logger.info("Neo4j connected at %s", settings.neo4j_uri)
    except Exception as exc:
        _driver = None
        _use_neo4j = False
        logger.warning("Neo4j unavailable — chat will use in-memory storage: %s", exc)


def close_neo4j() -> None:
    global _driver, _use_neo4j
    if _driver is not None:
        _driver.close()
        _driver = None
    _use_neo4j = False


def get_neo4j() -> Driver:
    if _driver is None:
        raise RuntimeError("Neo4j driver is not initialized.")
    return _driver


def _ensure_constraints() -> None:
    driver = get_neo4j()
    statements = [
        "CREATE CONSTRAINT chat_user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
        "CREATE CONSTRAINT chat_room_id IF NOT EXISTS FOR (r:ChatRoom) REQUIRE r.id IS UNIQUE",
        "CREATE CONSTRAINT chat_message_id IF NOT EXISTS FOR (m:Message) REQUIRE m.id IS UNIQUE",
    ]
    with driver.session() as session:
        for statement in statements:
            session.run(statement)
