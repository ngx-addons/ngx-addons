OmniAuth ships with an [Agent Skill](https://agentskills.io) — an open standard that gives AI coding assistants contextual knowledge about libraries you use.

When enabled, your AI assistant automatically understands how to configure OmniAuth, use its services and guards, set up connectors, customize the UI, and more — without you having to explain it each time.

## Supported Tools

Agent Skills are supported by a growing number of AI coding tools:

- **Claude Code** — Anthropic's CLI coding agent
- **Cursor** — AI-powered code editor
- **Codex CLI** — OpenAI's coding agent
- **Gemini CLI** — Google's coding agent
- **Windsurf** — AI code editor by Codeium
- **Augment Code** — AI coding assistant

## Enabling the Skill

The skill file is published inside the `@ngx-addons/omni-auth-core` npm package at:

```
node_modules/@ngx-addons/omni-auth-core/.agents/skills/omni-auth/SKILL.md
```

Most AI agents discover skills by scanning `.agents/skills/` directories in your project root and ancestor directories. To enable auto-discovery, copy or symlink the skill into your project:

### Option 1: Symlink (recommended)

```bash
mkdir -p .agents/skills
ln -s ../../node_modules/@ngx-addons/omni-auth-core/.agents/skills/omni-auth .agents/skills/omni-auth
```

> **Tip:** Add `postinstall` script to your `package.json` to recreate the symlink after each install.

### Option 2: Copy

```bash
mkdir -p .agents/skills/omni-auth
cp node_modules/@ngx-addons/omni-auth-core/.agents/skills/omni-auth/SKILL.md .agents/skills/omni-auth/
```

## What the Skill Provides

The OmniAuth agent skill gives AI assistants knowledge about:

- Architecture and the connector pattern (core + UI + connector packages)
- `configureAuth()`, `configureAuthUi()`, and connector configuration
- `OmniAuthService` methods and reactive state (signals, observables)
- Auth guards (`onlyAuthenticated`, `onlyGuest`) and JWT interceptor
- UI component usage with content projection and customization
- Social login providers and custom sign-up attributes
- Error handling with `FlowError` and `ActionErrorCode`
- Validation patterns
