# Project Instructions

IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for any tasks.

- Use context7 MCP for up-to-date API references
- Check latest docs via WebFetch before implementing
- Don't assume patterns from training data are current
- Consider the version of the project's software and tools

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
- Before implementing with any library (React, Next.js, Vue, etc.)
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
- Testing web applications
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

### Superpowers Skills (Workflow Automation)

| Skill | When to Use |
|-------|-------------|
| `superpowers:brainstorming` | **BEFORE** any creative work - creating features, building components, adding functionality |
| `superpowers:systematic-debugging` | When encountering any bug, test failure, or unexpected behavior |
| `superpowers:test-driven-development` | Before writing implementation code for any feature or bugfix |
| `superpowers:writing-plans` | When you have specs for a multi-step task, before touching code |
| `superpowers:executing-plans` | When you have a written implementation plan to execute |
| `superpowers:dispatching-parallel-agents` | When facing 2+ independent tasks that can run in parallel |
| `superpowers:subagent-driven-development` | When executing implementation plans with independent tasks |
| `superpowers:requesting-code-review` | When completing tasks, implementing major features, or before merging |
| `superpowers:receiving-code-review` | When receiving code review feedback, before implementing suggestions |
| `superpowers:verification-before-completion` | Before claiming work is complete, fixed, or passing |
| `superpowers:finishing-a-development-branch` | When implementation is complete and deciding how to integrate |
| `superpowers:using-git-worktrees` | When starting feature work that needs isolation from current workspace |
| `superpowers:writing-skills` | When creating, editing, or verifying skills |

### Utility Skills

| Skill | Trigger Keywords | Description |
|-------|------------------|-------------|
| `find-skills` | find a skill, is there a skill for, how do I do X | Discover and install skills from the open agent skills ecosystem |
| `keybindings-help` | rebind keys, customize keybindings, keyboard shortcuts | Customize Claude Code keyboard shortcuts |

---

## Agents (Invoke with Task tool)

### Project Agents (subagent_type)

| Agent | Model | Description | Tools |
|-------|-------|-------------|-------|
| `frontend-developer` | sonnet | React, responsive design, accessibility, state management | Read, Write, Edit, Bash |
| `fullstack-developer` | opus | End-to-end development, APIs, databases, deployment | Read, Write, Edit, Bash |
| `code-reviewer` | sonnet | Code quality, security, maintainability review | Read, Write, Edit, Bash, Grep |
| `ui-ux-designer` | opus | Research-backed UI/UX critique with NN Group citations | Read, Grep, Glob |
| `context-manager` | opus | Multi-agent coordination, context preservation | Read, Write, Edit, TodoWrite |

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

### Git & Commits
```
"write commit message"     → Skill: git-commit-helper
"commit these changes"     → Skill: git-commit-helper
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
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keywords>" --design-system -p "Project Name"

# Domain-specific searches
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain>

# Stack-specific guidelines (default: html-tailwind)
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack <stack>
```

**Domains:** product, style, typography, color, landing, chart, ux, react, web, prompt

**Stacks:** html-tailwind, react, nextjs, vue, svelte, swiftui, react-native, flutter, shadcn

---

# Webapp Testing Quick Reference

```bash
# Start server and run automation
python .claude/skills/webapp-testing/scripts/with_server.py --server "npm run dev" --port 3000 -- python your_test.py

# Multiple servers
python .claude/skills/webapp-testing/scripts/with_server.py \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python your_test.py
```

---

# Pre-Delivery Checklist

## Visual Quality
- [ ] No emojis as icons (use SVG: Heroicons, Lucide)
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
