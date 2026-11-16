---
description: Tests for the dispatch handler use the shared FakeShippingUnitOfWork and the fixed clock, with no mocks, even though the create tests beside them patch the handler with AsyncMock.
tags: [testing]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Write tests for the dispatch_shipment handler in tests/shipping/test_dispatch_shipment.py.
