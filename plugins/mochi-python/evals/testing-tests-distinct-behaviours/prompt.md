---
description: Tests for postal-code validation assert the named domain exception, name each behaviour with its condition, and give any parametrize rows ids, even though the tariff test beside them is a table of same-branch rows named test_price.
tags: [testing]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

Add tests for Consignee's postal-code validation in tests/shipping/test_consignee.py.
