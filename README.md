# QuickDesk — AI-Assisted Internal Helpdesk

QuickDesk is a full-stack internal helpdesk platform where employees raise support tickets and AI triages them in the background. Every ticket is instantly classified (category + priority) by an LLM, and a RAG pipeline drafts a resolution reply from an internal knowledge base. Agents review, override, and resolve tickets through a real-time dashboard. The entire system is containerized and runs with a single `docker compose up`.

---

## How to Run Locally

### Prerequisites

- **Docker** and **Docker Compose** (recommended)
- Or: **Python 3.12+**, **Node.js 22+**, **PostgreSQL 15+** for manual setup
- An **NVIDIA NIM API key** (free tier: [build.nvidia.com](https://build.nvidia.com))

### Option 1: Docker Compose (recommended)

```bash
git clone <repo-url> && cd quickdesk

# Configure your API key
cp backend/.env.example backend/.env
# Edit backend/.env and set NVIDIA_API_KEY=nvapi-...

docker compose up --build -d
```

Open **http://localhost:5173** in your browser.

### Option 2: Manual Setup

```bash
# 1. Start PostgreSQL (or use an existing instance)
#    Create a database named "quickdesk"

# 2. Backend
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL, SECRET_KEY, NVIDIA_API_KEY

pip install uv          # if not already installed
uv sync
uv run alembic upgrade head
uv run python -m app.seed
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api/*` and `/ws/*` to the backend.

### Seed Accounts

| Role | Email | Password |
|------|-------|----------|
| Employee | `employee@quickdesk.com` | `password123` |
| Agent | `agent@quickdesk.com` | `password123` |
| Superadmin | `admin@quickdesk.com` | `password123` |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER                                    │
│  React SPA (Vite)                                                   │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐   │
│  │  Login / │  │   Employee   │  │   Agent    │  │  SuperAdmin  │   │
│  │ Register │  │   Portal     │  │  Workspace │  │   Control    │   │
│  └────┬─────┘  └──────┬───────┘  └─────┬──────┘  └──────┬───────┘   │
│       │               │                │                │           │
│       └───────────────┴────────┬───────┴────────────────┘           │
│                                │                                    │
│                   fetch(/api/*) + WebSocket(/ws/tickets)            │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Nginx (production)    │ 
                    │   or Vite proxy (dev)   │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│                        FastAPI Backend                              │
│                                                                     │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────────┐     │
│  │  Auth   │  │ Tickets  │  │  Metrics  │  │    WebSocket     │     │
│  │ Router  │  │  Router  │  │  Router   │  │   (broadcast)    │     │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └────────┬─────────┘     │
│       │            │              │                   │             │
│  ┌────▼────┐  ┌────▼──────────────▼───┐         ┌────▼─────────┐    │
│  │  Auth   │  │   Ticket Service      │         │  WS Service  │    │
│  │ Service │  │  ┌─────────────────┐  │         │  (in-memory  │    │
│  │ (JWT +  │  │  │ Background Task │  │         │   conn list) │    │
│  │  RBAC)  │  │  │  AI + RAG call  │  │         └──────────────┘    │
│  └─────────┘  │  └───────┬─────────┘  │                             │
│               └──────────┼────────────┘                             │
│                          │                                          │
│            ┌─────────────┼─────────────┐                            │
│            │             │             │                            │
│     ┌──────▼──────┐ ┌───▼────┐ ┌──────▼──────┐                      │
│     │  AIService  │ │  RAG   │ │  Metrics    │                      │
│     │  (classify) │ │Service │ │  Service    │                      │
│     │  NVIDIA NIM │ │(draft) │ │  (analytics)│                      │
│     └─────────────┘ └───┬────┘ └─────────────┘                      │
│                         │                                           │
│              ┌──────────▼──────────┐                                │
│              │  Chroma Vector DB   │                                │
│              │  (NVIDIA Embeddings │                                │
│              │   nv-embedqa-e5-v5) │                                │
│              └─────────────────────┘                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               PostgreSQL (async via asyncpg)                 │   │
│  │   users │ tickets │ audit_logs                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Authentication

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/api/auth/register` | Register new user (always employee role) | No |
| `POST` | `/api/auth/login` | Login, returns JWT access token | No |
| `GET` | `/api/auth/me` | Get current user profile | Bearer |
| `GET` | `/api/auth/users` | List all users | Superadmin |
| `POST` | `/api/auth/users` | Create user with custom role | Superadmin |
| `PATCH` | `/api/auth/users/{id}` | Update user details/role | Superadmin |

### Tickets

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/api/tickets` | Create ticket (queues AI classification in background) | Bearer |
| `GET` | `/api/tickets` | List tickets (employee: own only; agent/admin: all) | Bearer |
| `PATCH` | `/api/tickets/{id}` | Update category/priority/status (audit logged) | Agent, Superadmin |
| `POST` | `/api/tickets/{id}/reply` | Submit final resolution, marks ticket resolved | Agent, Superadmin |
| `GET` | `/api/tickets/{id}/audit-logs` | Get override audit history for a ticket | Bearer |

### Metrics & Real-time

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `GET` | `/api/metrics` | Dashboard analytics (status counts, categories, median resolution, override %) | Agent, Superadmin |
| `WS` | `/ws/tickets` | Real-time ticket event stream (created, updated, resolved) | None (open) |
| `GET` | `/api/health` | Health check | None |

---

## Decisions and Tradeoffs

### a) Why React (Vite) instead of Next.js?

This is an internal SPA, not a public-facing site. There is no need for SSR, SEO, or file-based routing. React + Vite gives me a faster dev loop (~250ms builds), zero server-side complexity, and a smaller deployment artifact (a static `dist/` folder served by Nginx). Next.js would add a Node runtime to production for no benefit. The Vite proxy handles `/api` and `/ws` forwarding during development, making the DX seamless.

### b) How is the RAG pipeline structured?

The pipeline uses a **two-stage retrieval-augmented generation** approach:

1. **Ingestion**: Six markdown knowledge base articles (VPN setup, password reset, leave policy, expense reimbursement, laptop requests, WiFi access) are loaded via LangChain's `DirectoryLoader`, chunked with `RecursiveCharacterTextSplitter` (chunk size: 600 chars, overlap: 80 chars), and embedded into a persistent **Chroma vector database** using **NVIDIA `nv-embedqa-e5-v5` embeddings**.

2. **Retrieval + Generation**: On ticket creation, the top 2 semantically similar chunks are retrieved via Chroma's similarity search. A keyword-overlap relevance check (`_is_relevant`) acts as an anti-hallucination guardrail — if no query word (length > 2) appears in the retrieved documents, the system returns an explicit fallback: *"No relevant knowledge base article found for this ticket."* If relevant, the chunks are fed as context into a **LangChain prompt → NVIDIA ChatNVIDIA (LLaMA 3.1 8B) → StrOutputParser** chain that drafts a step-by-step resolution.

**Chunk size rationale**: 600 chars keeps each chunk focused on a single procedure (e.g., one set of VPN steps) without splitting mid-instruction. The 80-char overlap prevents losing context at chunk boundaries.

### c) How do you handle invalid LLM categories?

The `AIService.classify_ticket` method parses the LLM's JSON response and validates both `ai_category` and `ai_priority` against hardcoded allowlists (`["it", "hr", "finance", "admin", "other"]` and `["low", "medium", "high"]`). If the LLM returns an unexpected value, it silently falls back to `"other"` / `"medium"`. If the LLM returns unparseable output (no valid JSON), the entire `except` block catches it and defaults to the same safe fallback. The system never persists an invalid enum value.

### d) Where is the JWT stored on the client, and why?

The JWT is stored in **localStorage**, XOR-obfuscated with a salt and Base64-encoded before writing (see `frontend/src/utils/storage.js`). I chose localStorage over cookies because the backend is a pure API (no cookie-based sessions), and it simplifies the auth header flow across `fetch` calls and WebSocket connections. The XOR obfuscation is not cryptographic security — it prevents casual inspection from browser devtools but would not stop a determined attacker with JS access. In a production environment with XSS risk, I would use `httpOnly` secure cookies with CSRF protection instead.

### e) How is role-based access enforced on the backend?

Every protected endpoint uses a FastAPI dependency: `RoleChecker(["agent", "superadmin"])`. This is a callable class that first resolves the current user from the JWT token (via `get_current_user`), then checks `current_user.role` against the allowed roles list. If the role doesn't match, it raises `HTTP 403 Forbidden`. There is no client-side-only enforcement — even if an employee guesses `/api/tickets/{id}` with a PATCH request, the `RoleChecker` dependency on the route handler rejects the request before any business logic runs. The `TicketService.list_tickets` method additionally filters query results by role: employees only see their own tickets, agents and superadmins see all.

### f) Why native WebSockets? What happens on disconnect?

I chose native WebSockets over Socket.IO or SSE because the event model is simple (three event types: `ticket_created`, `ticket_updated`, `ticket_resolved`) and native WS keeps the dependency footprint minimal. Socket.IO adds ~50KB of client bundle, room management, and fallback transports I don't need.

**Failure mode**: If the WebSocket disconnects (network drop, server restart), the client `useWebSocket` hook implements **exponential backoff reconnection** (1s → 2s → 4s → ... up to 30s cap). During the disconnect window, the dashboard becomes stale — but the next reconnect triggers a full data refetch (`fetchData()`), so no events are permanently lost. The user can also manually refresh via the ↻ button. There is no message queue or replay buffer on the server; events fired while a client is disconnected are missed. For production, I would add a last-event-ID mechanism or short-lived Redis pub/sub replay.

### g) Worst failure mode today?

**The NVIDIA API going down or rate-limiting.** If the NVIDIA NIM endpoint is unreachable during the background classification task, the `except` block in `classify_and_update_bg` catches the error and logs it, but the ticket stays in the database with `ai_category`, `ai_priority`, and `ai_draft` all set to `NULL`. The frontend handles this gracefully (shows "AI Analyzing..." spinner), but the ticket will never get classified unless an agent manually sets the fields or the task is retried.

**What I would do**: Add a dead-letter retry queue (e.g., Celery + Redis) with 3 retry attempts and exponential backoff. Store failed task IDs in a `failed_tasks` table so a superadmin can trigger manual reclassification. Add a circuit breaker pattern around the NVIDIA client to fail fast when the API is confirmed down.

### h) Where did AI tools help most? Where did they hurt?

**Helped most**: Scaffolding repetitive CRUD boilerplate (models, schemas, routers), generating the initial CSS design system, and drafting the LangChain RAG chain configuration. AI tools also accelerated writing the test fixtures (conftest.py with in-memory SQLite override pattern).

**Hurt/misled**: Early on, the AI generated an email-formatted RAG response (with "Dear [User]" and "Subject: Re: ...") that was completely wrong for an internal helpdesk draft. It also initially calculated the AI override metric incorrectly — only checking category changes, missing priority overrides, reply edits, and audit log entries. Both required manual debugging and explicit correction. The lesson: AI is fast at structure, unreliable at domain-specific business logic. Every generated function needed a careful read-through against the actual requirements.

---

## What I Would Do With More Time

- **Retry queue for failed AI tasks**: Celery + Redis worker to retry classification/RAG when the NVIDIA API is down, with a dead-letter table for manual retry.
- **WebSocket authentication**: Currently the WS endpoint is open. I would validate the JWT on the initial handshake and only broadcast role-appropriate events.
- **Database-level metrics aggregation**: The current `MetricsService` does an O(N) Python loop over all tickets. With thousands of tickets, this should move to SQL aggregation queries or a materialized view.
- **Attachment file uploads**: The `attachment` field exists in the schema but only stores a URL string. I would add S3/MinIO upload with presigned URLs.
- **Pagination on the backend**: Currently all tickets are fetched and paginated client-side. For scale, I would add `limit/offset` query params to the `/api/tickets` endpoint.
- **End-to-end tests**: Playwright tests covering the full employee → agent → resolution workflow in a browser.
- **Proper token storage**: Migrate from localStorage to `httpOnly` secure cookies with CSRF tokens.

---

## Known Issues / Limitations

1. **WebSocket is unauthenticated** — any client can connect to `/ws/tickets` and receive all ticket events. Not suitable for a multi-tenant deployment without adding JWT validation on the WS handshake.
2. **No backend pagination** — the `/api/tickets` endpoint returns all tickets. Client-side pagination (8 per page) masks this, but it won't scale past a few thousand tickets.
3. **AI classification is fire-and-forget** — if the background task fails, the ticket stays unclassified with no automatic retry.
4. **Single-process WebSocket state** — the `active_connections` list lives in memory. Scaling to multiple backend workers would require Redis pub/sub to coordinate broadcasts.
5. **XOR token obfuscation is not encryption** — it deters casual inspection but does not protect against XSS. A compromised page can still extract the token.
6. **No rate limiting** — auth endpoints have no throttling against brute-force login attempts.

---

## Running Tests

```bash
cd backend
uv run pytest tests/ -v
```

Tests use an in-memory SQLite database (no PostgreSQL required) and run in ~1.5 seconds.

| Test | What It Validates |
|------|-------------------|
| `test_register_login_and_me` | Full auth lifecycle: register → login → JWT → /me |
| `test_login_wrong_password_rejected` | Invalid credentials return 401 |
| `test_employee_cannot_access_agent_endpoint` | Employee token blocked by RoleChecker (403) |
| `test_agent_can_access_agent_endpoint` | Agent token passes RoleChecker (200) |
| `test_rag_fallback_when_no_kb_match` | RAG returns explicit fallback instead of hallucinating |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, React Router 7, Lucide Icons |
| Backend | FastAPI, SQLModel, Alembic, asyncpg |
| AI/RAG | LangChain, NVIDIA NIM (LLaMA 3.1 8B), NVIDIA Embeddings (nv-embedqa-e5-v5), Chroma |
| Database | PostgreSQL 15 |
| Real-time | Native WebSockets (FastAPI) |
| Infra | Docker Compose, Nginx, uv |
