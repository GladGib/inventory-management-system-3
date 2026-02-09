# Project Instructions

IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for any tasks.

- Use context7 MCP for up-to-date API references
- Check latest docs via WebFetch before implementing
- Don't assume patterns from training data are current
- Consider the version of the project's software and tools

---

# Prisma Schema Changes (IMPORTANT)

When modifying `backend/prisma/schema.prisma`, ALWAYS create a migration:

```bash
cd backend && npx prisma migrate dev --name descriptive_name
```

**Never** use `prisma db push` and commit without a migration. This causes schema drift that breaks fresh setups.

---

# Project Overview

**Inventory Management System** for Malaysian SMEs (auto parts, hardware, spare parts wholesalers).

- **Author:** Dynamic Edge
- **Monorepo** managed with pnpm workspaces
- **Node:** >=20.0.0 | **pnpm:** >=8.0.0

---

# Project Structure

```
inventory-management-system-3/
  apps/
    api/          # NestJS backend (port 3001)
    web/          # Next.js frontend (port 3000)
    mobile/       # Expo/React Native mobile app
  docs/           # BACKLOG.md, IMPLEMENTATION_PLAN.md
  docker/         # init-db.sql
  scripts/        # Windows batch scripts (start-web.bat, start-mobile.bat, stop-all.bat)
  openspec/       # Spec-driven development (~97 spec directories)
    config.yaml
    specs/        # Feature specifications
    changes/      # Archived implementation phases
  .claude/
    agents/       # Custom agent definitions (Jenny, fullstack-developer, etc.)
    skills/       # Installed skills
```

---

# Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **API** | NestJS v10 | 38+ modules, Swagger docs at `/api/docs` |
| **ORM** | Prisma v5 | Schema at `apps/api/prisma/schema.prisma` (2500+ lines) |
| **Database** | PostgreSQL 16 | Dockerized, port 5432 |
| **Cache/Queue** | Redis 7 + BullMQ | Dockerized, port 6379 |
| **Search** | Elasticsearch 8.13 | Optional, falls back to DB queries |
| **Storage** | MinIO (S3-compatible) | File uploads, ports 9000/9001 |
| **Email** | Nodemailer + Mailpit | Dev SMTP on port 1025, UI on port 8025 |
| **Web** | Next.js 14 (App Router) | Ant Design v5, Zustand, TanStack Query |
| **Mobile** | Expo v50 + React Native 0.73 | Zustand, Expo Router, biometric auth |
| **PDF** | Puppeteer | Server-side PDF generation |
| **Auth** | Passport.js (JWT + Local) | Separate admin and portal JWT secrets |

### Malaysian-Specific Integrations
- **MyInvois** e-Invoice (LHDN compliance)
- **Payment Gateways:** FPX, DuitNow, GrabPay, Touch 'n Go

---

# Development Commands

## Root-level (from project root)

```bash
pnpm dev              # Start all apps in parallel
pnpm dev:api          # Start API only
pnpm dev:web          # Start web only
pnpm build            # Build all apps
pnpm build:api        # Build API only
pnpm build:web        # Build web only
pnpm lint             # Lint all apps
pnpm test             # Run all tests
pnpm clean            # Remove node_modules, dist, .next from all apps
```

## Database

```bash
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run Prisma migrations
pnpm db:studio        # Open Prisma Studio
```

## Docker Services

```bash
docker-compose up -d        # Start all infrastructure (Postgres, Redis, MinIO, Elasticsearch, Mailpit)
docker-compose down         # Stop all infrastructure
docker-compose down -v      # Stop and remove volumes (DESTRUCTIVE)
```

## Windows Scripts

```bash
scripts\start-web.bat       # Start Docker + API + Web (checks ports, waits for readiness)
scripts\start-mobile.bat    # Start Docker + API (then manually: cd apps/mobile && npx expo start)
scripts\stop-all.bat        # Stop all services
```

## Running Tests

```bash
cd apps/api && pnpm test          # API unit tests (Jest)
cd apps/web && pnpm test          # Web component tests (Jest + Testing Library)
cd apps/web && pnpm test:e2e      # Web E2E tests (Playwright)
```

## TypeScript Checking

```bash
cd apps/api && npx tsc --noEmit   # API type check
cd apps/web && npx tsc --noEmit   # Web type check
```

---

# Service URLs (Development)

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API | http://localhost:3001 |
| API Docs (Swagger) | http://localhost:3001/api/docs |
| Mailpit (Email UI) | http://localhost:8025 |
| MinIO Console | http://localhost:9001 |
| Elasticsearch | http://localhost:9200 |
| Prisma Studio | http://localhost:5555 |

---

# Prisma Schema Changes (IMPORTANT)

When modifying `apps/api/prisma/schema.prisma`, ALWAYS create a migration:

```bash
cd apps/api
npx prisma migrate dev --name descriptive_name
```

**Never** use `prisma db push` during development and commit schema changes without a migration. This causes schema drift where migrations don't match the schema, breaking fresh setups.

---

# Key Architecture Patterns

### API (NestJS)
- **Module-based architecture** with dependency injection
- **Path alias:** `@/` maps to `apps/api/src/`
- **API prefix:** `/api/v1`
- **Auth guards:** `JwtAuthGuard` for admin routes, `JwtPortalGuard` for portal routes
- **Multi-tenant:** All queries scoped by `organizationId`
- **Validation:** `class-validator` decorators on DTOs

### Web (Next.js)
- **App Router** with route groups: `(auth)` for login, `(dashboard)` for main app, `portal` for customer/vendor portals
- **Path alias:** `@/` maps to `apps/web/src/`
- **State:** Zustand stores for UI state, TanStack Query for server state
- **UI:** Ant Design v5 with custom theme
- **API client:** Axios with interceptors for JWT refresh

### Mobile (Expo)
- **Expo Router** for file-based navigation
- **State:** Zustand stores, TanStack Query
- **Auth:** JWT tokens in expo-secure-store, biometric unlock via expo-local-authentication
- **Offline:** Network status detection, offline queue with auto-sync
- **App scheme:** `imspro`

---

# Available Tools & Routing

## MCP Servers

### Context7 (Documentation Retrieval)
Use for up-to-date library documentation and code examples.

```
mcp__plugin_context7_context7__resolve-library-id  → Find library ID
mcp__plugin_context7_context7__query-docs          → Query documentation
```

**When to use:**
- Before implementing with any library (NestJS, Next.js, Prisma, Expo, Ant Design, etc.)
- When unsure about current API patterns
- For code examples and best practices

### Playwright (Browser Automation)
Use for browser testing and UI verification.

```
mcp__plugin_playwright_playwright__browser_navigate   → Go to URL
mcp__plugin_playwright_playwright__browser_snapshot   → Capture accessibility tree
mcp__plugin_playwright_playwright__browser_click      → Click elements
mcp__plugin_playwright_playwright__browser_type       → Type text
mcp__plugin_playwright_playwright__browser_take_screenshot → Capture screenshot
```

**When to use:**
- Testing the web app at http://localhost:3000
- Verifying UI behavior
- Capturing screenshots for review
- Debugging frontend issues

---

## Skills (Invoke with Skill tool)

### Frontend & Design Skills

| Skill | Trigger Keywords | Description |
|-------|------------------|-------------|
| `frontend-design` | build UI, create component, design page, landing page, dashboard, style this | Creates distinctive, production-grade frontend interfaces avoiding generic AI aesthetics |
| `ui-ux-pro-max` | design system, color palette, typography, accessibility, animation, layout | 50 styles, 21 palettes, 50 font pairings, 9 stacks (React, Next.js, Vue, Svelte, etc.) |

### Testing & Development Skills

| Skill | Trigger Keywords | Description |
|-------|------------------|-------------|
| `webapp-testing` | test the app, verify UI, browser test, screenshot, check frontend | Playwright-based testing with server lifecycle management |
| `git-commit-helper` | commit message, staged changes, write commit | Conventional commit message generation from git diffs |

### OpenSpec Skills (Spec-Driven Development)

| Skill | Description |
|-------|-------------|
| `openspec-new-change` / `opsx:new` | Start a new change with structured artifacts |
| `openspec-continue-change` / `opsx:continue` | Create the next artifact for a change |
| `openspec-ff-change` / `opsx:ff` | Fast-forward: generate all artifacts at once |
| `openspec-apply-change` / `opsx:apply` | Implement tasks from a change |
| `openspec-verify-change` / `opsx:verify` | Verify implementation matches artifacts |
| `openspec-sync-specs` / `opsx:sync` | Sync delta specs to main specs |
| `openspec-archive-change` / `opsx:archive` | Archive a completed change |
| `openspec-bulk-archive-change` / `opsx:bulk-archive` | Archive multiple completed changes |
| `openspec-explore` / `opsx:explore` | Thinking partner for exploring ideas |
| `openspec-onboard` / `opsx:onboard` | Guided onboarding walkthrough |

### Utility Skills

| Skill | Trigger Keywords | Description |
|-------|------------------|-------------|
| `keybindings-help` | rebind keys, customize keybindings, keyboard shortcuts | Customize Claude Code keyboard shortcuts |

---

## Agents (Invoke with Task tool)

### Custom Project Agents (subagent_type)

| Agent | Description | Tools |
|-------|-------------|-------|
| `frontend-developer` | React/Next.js, responsive design, accessibility, Ant Design components | Read, Write, Edit, Bash |
| `fullstack-developer` | End-to-end: NestJS APIs, Prisma models, Next.js pages, Expo screens | Read, Write, Edit, Bash |
| `code-reviewer` | Code quality, security, maintainability review | Read, Write, Edit, Bash, Grep |
| `ui-ux-designer` | Research-backed UI/UX critique with NN Group citations | Read, Grep, Glob |
| `context-manager` | Multi-agent coordination, context preservation across sessions | Read, Write, Edit, TodoWrite |
| `Jenny` | Verification agent: checks implementation against specs for gaps | All tools |

### Built-in Subagents

| Subagent | When to Use |
|----------|-------------|
| `Explore` | Codebase exploration, finding files, understanding structure |
| `Plan` | Designing implementation strategies, architectural planning |
| `Bash` | Git operations, command execution, terminal tasks |
| `general-purpose` | Multi-step research, complex information gathering |
| `claude-code-guide` | Questions about Claude Code features, hooks, MCP servers |

---

# Routing Rules

## Pre-Implementation Checklist

1. **Before ANY creative/feature work** → `superpowers:brainstorming`
2. **Before implementing with libraries** → Context7 MCP for current docs
3. **Before multi-step tasks** → `superpowers:writing-plans`
4. **Before writing implementation code** → Consider `superpowers:test-driven-development`

## Task-Based Routing

### UI/UX Work
```
"build landing page"       → Skill: frontend-design + ui-ux-pro-max
"design dashboard"         → Skill: frontend-design
"review UI accessibility"  → Agent: ui-ux-designer
"create React component"   → Agent: frontend-developer
```

### Full-Stack Development
```
"implement API endpoint"   → Agent: fullstack-developer
"add database model"       → Agent: fullstack-developer
"create authentication"    → Agent: fullstack-developer
```

### Testing & QA
```
"test the webapp"          → Skill: webapp-testing + Playwright MCP
"verify frontend works"    → Skill: webapp-testing
"browser screenshot"       → Playwright: browser_take_screenshot
```

### Code Quality
```
"review my code"           → Agent: code-reviewer + superpowers:requesting-code-review
"check for issues"         → Agent: code-reviewer
"security review"          → Agent: code-reviewer
```

### Gap Analysis & Verification
```
"verify implementation"    → Agent: Jenny
"check against specs"      → Agent: Jenny
"are we done?"             → Agent: Jenny
```

### Git & Commits
```
"write commit message"     → Skill: git-commit-helper
"commit these changes"     → Skill: git-commit-helper
```

### Spec-Driven Development
```
"new feature change"       → Skill: openspec-new-change or opsx:new
"implement from spec"      → Skill: openspec-apply-change or opsx:apply
"verify against spec"      → Skill: openspec-verify-change or opsx:verify
```

### Debugging
```
"bug", "failing test", "unexpected behavior" → superpowers:systematic-debugging
```

### Context Management
```
"complex project", "multi-agent coordination" → Agent: context-manager
"preserve context", "session coordination"   → Agent: context-manager
```

### Research & Exploration
```
"where is X", "how does X work", "codebase structure" → Subagent: Explore
"find files matching", "understand this code"         → Subagent: Explore
```

---

# UI/UX Pro Max Quick Reference

When doing UI/UX work, use the search script:

```bash
# Generate complete design system (REQUIRED first step)
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keywords>" --design-system -p "IMS Pro"

# Domain-specific searches
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain>

# Stack-specific guidelines
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack <stack>
```

**Domains:** product, style, typography, color, landing, chart, ux, react, web, prompt

**Stacks:** html-tailwind, react, nextjs, vue, svelte, swiftui, react-native, flutter, shadcn

---

# Webapp Testing Quick Reference

```bash
# Start Docker + API + Web, then run test automation
python .claude/skills/webapp-testing/scripts/with_server.py \
  --server "cd apps/api && pnpm run dev" --port 3001 \
  --server "cd apps/web && pnpm run dev" --port 3000 \
  -- python your_test.py
```

---

# Pre-Delivery Checklist

## Code Quality
- [ ] TypeScript compiles: `npx tsc --noEmit` in both `apps/api` and `apps/web`
- [ ] Tests pass: `pnpm test` from root
- [ ] No hardcoded secrets or credentials
- [ ] Multi-tenant queries scoped by `organizationId`

## Visual Quality
- [ ] No emojis as icons (use Ant Design icons or SVG)
- [ ] Consistent icon set and sizing
- [ ] Hover states don't cause layout shift
- [ ] All clickable elements have `cursor-pointer`

## Accessibility
- [ ] Color contrast 4.5:1 minimum for text
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected

## Responsive
- [ ] Test at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile
- [ ] Touch targets minimum 44x44px

## Before Claiming Complete
- [ ] Run verification commands (tests, build, lint)
- [ ] Use `superpowers:verification-before-completion`
- [ ] Evidence before assertions
