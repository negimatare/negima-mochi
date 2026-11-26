---
name: service-layer
description: Use-case conventions for FastAPI services in this stack — an injected clock, settings read once, and async code that never blocks. Use when writing handlers, bootstrap.py, or code that talks to an external system.
user-invocable: false
---

# Service layer

- **Settings are one `pydantic-settings` class**, built once and injected.
  Nothing else reads `os.environ`.
- **Time is a dependency**: code that needs the time takes a clock.
- An `async def` handler awaits only async I/O, and every outbound call has
  a timeout.

## Lint

Ruff holds these rules: the preset `${CLAUDE_PLUGIN_ROOT}/presets/ruff-lint.toml`
bans the direct time and environment calls outside `bootstrap.py`
(`TID251`), and turns on `ASYNC` and `S113`. `/mochi:setup-project` adds it
to the project.
