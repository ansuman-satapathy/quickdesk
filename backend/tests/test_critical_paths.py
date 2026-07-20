"""
Critical path tests for QuickDesk:
  1. Auth: register → login → token works on /me
  2. Auth: invalid credentials are rejected
  3. Role enforcement: employee cannot access agent-only endpoints
  4. Role enforcement: agent CAN access agent-only endpoints
  5. RAG: fallback reply when no KB match exists
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch

from app.models.user import UserRole
from app.services.rag_service import RAGService
from tests.conftest import create_test_user, auth_header


# ═══════════════════════════════════════════════════════════════════════════
# 1. AUTH — Full register → login → /me flow
# ═══════════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_register_login_and_me(client):
    """A new user can register, log in, and retrieve their profile via /me."""
    # Register
    reg = await client.post("/api/auth/register", json={
        "email": "newuser@test.com",
        "password": "securepass123",
        "full_name": "New User",
    })
    assert reg.status_code == 201
    assert reg.json()["email"] == "newuser@test.com"
    assert reg.json()["role"] == "employee"  # public signup → always employee

    # Login
    login = await client.post("/api/auth/login", json={
        "email": "newuser@test.com",
        "password": "securepass123",
    })
    assert login.status_code == 200
    token = login.json()["access_token"]
    assert token  # non-empty JWT

    # /me with the obtained token
    me = await client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert me.status_code == 200
    assert me.json()["email"] == "newuser@test.com"
    assert me.json()["full_name"] == "New User"


# ═══════════════════════════════════════════════════════════════════════════
# 2. AUTH — Invalid credentials rejected with 401
# ═══════════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_login_wrong_password_rejected(client, db_session):
    """Login with incorrect password returns 401 Unauthorized."""
    await create_test_user(db_session, "alice@test.com", UserRole.EMPLOYEE)

    resp = await client.post("/api/auth/login", json={
        "email": "alice@test.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401
    assert "Incorrect email or password" in resp.json()["detail"]


# ═══════════════════════════════════════════════════════════════════════════
# 3. ROLE ENFORCEMENT — Employee blocked from agent-only endpoint
# ═══════════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_employee_cannot_access_agent_endpoint(client, db_session):
    """An employee token must be rejected by agent-only routes with 403."""
    employee = await create_test_user(db_session, "emp@test.com", UserRole.EMPLOYEE)

    resp = await client.get("/api/auth/agent-only", headers=auth_header(employee))
    assert resp.status_code == 403
    assert "permission" in resp.json()["detail"].lower()


# ═══════════════════════════════════════════════════════════════════════════
# 4. ROLE ENFORCEMENT — Agent passes agent-only endpoint
# ═══════════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_agent_can_access_agent_endpoint(client, db_session):
    """An agent token must be accepted by agent-only routes."""
    agent = await create_test_user(db_session, "agent@test.com", UserRole.AGENT)

    resp = await client.get("/api/auth/agent-only", headers=auth_header(agent))
    assert resp.status_code == 200
    assert resp.json()["email"] == "agent@test.com"


# ═══════════════════════════════════════════════════════════════════════════
# 5. RAG — Fallback reply when query has no KB match
# ═══════════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_rag_fallback_when_no_kb_match():
    """
    When the ticket content doesn't match any knowledge base article,
    the RAG service must return the explicit fallback message instead
    of hallucinating a response.
    """
    service = RAGService(kb_dir="/nonexistent/path", chroma_dir="/nonexistent/chroma")

    result = await service.generate_draft_reply(
        title="Recipe for apple pie",
        description="I need a good recipe for baking apple pie with cinnamon",
    )

    assert result["ai_draft"] == "No relevant knowledge base article found for this ticket."
    assert result["citations"] == []
