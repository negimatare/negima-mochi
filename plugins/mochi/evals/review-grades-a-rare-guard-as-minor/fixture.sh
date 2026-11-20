#!/usr/bin/env bash
# The branch adds a notifications worker: it sends each job's email and
# records the job as done, with a test for that path. It also guards against
# a job that a worker restart replays. No test enters the guard.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src
cat > CLAUDE.md <<'Y'
# Notifications

A JavaScript worker that sends notification emails. No build step.

## Verification

- Test: `node --test` (one file: `node --test src/<name>.test.mjs`)
Y
echo 'export const version = 1;' > src/index.mjs
git add -A && git commit -q -m "feat: notifications"
git remote add origin https://example.invalid/notifications.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git checkout -q -b feat/email-worker
cat > src/worker.mjs <<'Y'
/** Sends the job's email and records the job as done. */
export const runJob = (job, store, send) => {
    const replayedAfterRestart = store.done.has(job.id);
    if (replayedAfterRestart) return "skipped";
    send(job.email);
    store.done.add(job.id);
    return "sent";
};
Y
cat > src/worker.test.mjs <<'Y'
import { deepStrictEqual, strictEqual } from "node:assert";
import { test } from "node:test";
import { runJob } from "./worker.mjs";

test("sends the email and records the job", () => {
    const store = { done: new Set() };
    const sent = [];
    strictEqual(runJob({ id: 7, email: "a@example.invalid" }, store, (email) => sent.push(email)), "sent");
    deepStrictEqual(sent, ["a@example.invalid"]);
    strictEqual(store.done.has(7), true);
});
Y
git add -A && git commit -q -m "feat(worker): send the notification emails" \
    -m "A worker restart replays the job that was in flight when the worker stopped, so skip a job that is already done."
