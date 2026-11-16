---
name: pr
description: Open a pull request for the current branch — a body written from the final diff for a busy reviewer (TL;DR, why, risk, reading order, review asks, manual test plan) plus self-review comments at the risky lines. Shows the draft before posting and creates the PR as a draft. Also restacks a pull request stacked on another one after its base moves or merges.
argument-hint: "[optional: base branch, tracker ID, links]"
disable-model-invocation: true
---

# Pull request

The user's notes: `$ARGUMENTS`

## 1. Check

- Tracked files are clean (`git status --porcelain --untracked-files=no`).
  Otherwise run the `commit` skill first.
- The branch is pushed and up to date with its upstream. If not, ask before
  pushing — publishing is the user's call.
- The base is the argument, else the default branch
  (`gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`), and it
  differs from the current branch. A base other than the default branch is
  the branch of the part below: this pull request is **stacked** on it.
- No PR exists yet (`gh pr view`). If one does, its base is the PR's
  `baseRefName`. When that PR is stacked, check its base: when the base's PR is merged
  (`gh pr view <base> --json state,headRefOid`) or the base has commits this
  branch lacks (`git rev-list --count HEAD..origin/<base>`), restack it
  (step 6). Otherwise offer to regenerate its body and comments.
- When `gh` is missing or not logged in, say so once and go on: take the
  base from the argument or `git symbolic-ref refs/remotes/origin/HEAD`, and
  write the draft. Only posting needs `gh`.

Use the repo's `.github/pull_request_template.md` when there is one; fit the
sections below into it.

## 2. Gather

Read `git log <base>..HEAD` and `git diff <base>...HEAD` — the **final diff**,
not your memory of the session. Take the tracker ID from the branch, the
commits, or the arguments; ask only when the work plausibly has one you cannot
find. Collect links to the request (issue, thread) and confirm them.

Then read what the branch already decided, when the files exist:

- **The plan**: `.plans/<date>-<slug>.md` with any date, where `<slug>` is the
  branch name after its `<type>/`, as the `commit` skill names it. Its
  rejected alternatives, the user's choices, and its accepted risks are
  **settled**. Its open questions are **open**.
- **The review findings**: `/mochi:review`'s file for this branch,
  `.reviews/REV-<YYYYMMDD>-<id>.md`, where `<id>` is the pull request number
  or, before there is one, the same `<slug>`. A finding not marked done is
  still open.

## 3. Write the body

For a reviewer arriving from a notification:

- **TL;DR** — one or two sentences: what changes for whom.
- **Why** — one paragraph per decision and its reason, with the alternative
  that lost. The diff shows *what*; never restate it. A settled decision
  goes here, with the plan's reason.
- **Risk** — what breaks if this is wrong, who notices, how to roll back.
  Say where reviewers can skim and where to focus. Each open review finding
  of 🟠 High or 🔴 Critical is a known gap here, with its follow-up.
- **How to review** — the file to read first, where the edge-case tests are,
  which commits review independently. Over about 400 changed lines, say how
  the change is structured.
- **Review asks** — only decisions that are still open, as questions the
  diff can answer: the plan's open questions, and a low-confidence choice
  the diff makes that nothing settled. Never a settled decision, and never
  an open review finding: a reviewer can do nothing with "this PR or a
  follow-up?". Most pull requests have no ask; then leave the section out.
  Product or UX questions belong elsewhere.
- **Test plan** — only what CI and the diff do not show: manual checks done
  (with environment), manual checks still needed before merge as unchecked
  boxes, and anything deliberately not verified with the accepted risk.
- **Links.**

A stacked pull request starts with one line above the TL;DR:
`Stacked on #<base PR> (part <n> of <total>). Merge it first.` Without `gh`,
name the base branch instead of the number.

**Title**: the commit header that a squash merge will use — the same rules
as the `commit` skill (Conventional Commits, imperative, lowercase, ticket ID
suffix).

Never narrate how the change was produced (agents, review rounds, fix
counts, earlier commits on the branch). Describe only the end state — nothing resolved, struck through, or
"updated". Check every factual claim ("no existing test changed") against the
diff before using it.

### Language: ASD-STE100 Simplified Technical English

Write the body and the comments in
[STE](https://www.asd-ste100.org/) so that every reader, including a non-native
reader, gets one meaning only:

- Sentences of at most 20 words for an instruction, 25 for a description.
- Paragraphs of at most six sentences, one topic each.
- Active voice. Passive only when the agent is unknown.
- Simple verb forms only: imperative, simple present, simple past, simple
  future. No perfect or progressive tenses, no "would/should have been".
- One instruction per sentence.
- No `-ing` word unless it is part of a technical name.
- Keep the articles and the subject; do not cut words to make it short.
- No noun clusters of more than three words.
- One word for one meaning, and the same word every time. Prefer the simple,
  common word ("use", not "leverage"; "start", not "kick off").
- Code identifiers, file paths, and product names are technical names: keep
  them exact, in backticks.
- Use a vertical list when a sentence would hold more than one condition or
  step.

## 4. Write the self-review comments

Comments on your own diff, at the line where a reviewer will get stuck:

- The first sentence is the ask: "Design decision for your opinion: …" or
  "Exception to the description: …".
- Concrete before/after against the base (a line new in this PR has no
  before), and the worst case in one sentence.
- Only diff-lifetime questions. Anything every future reader of the file
  needs belongs in a source comment instead.
- Every review ask in the body has its comment, and every ask-type comment is
  listed under Review asks. No ask, no "Design decision" comment.

## 5. Show, then post

When a 🟠 High or 🔴 Critical finding is still open, name it first: the user
can still fix it before the pull request goes out.

Show the title, body, and comments in the reply, and post only after the user
agrees. Without a working `gh`, also save the body to a file, give its path
and the commands below, and stop there:

```bash
gh pr create --draft --base <base> --title "<title>" --body-file <file>
gh api --method POST repos/{owner}/{repo}/pulls/<number>/reviews --input <review.json>
```

with `review.json` as
`{"event": "COMMENT", "comments": [{"path": "...", "line": N, "side": "RIGHT", "body": "..."}]}`.
Report the URL, and run `gh pr ready <number>` when the user says it is ready.
At squash merge, the final commit message is the PR title, and the extended
description is the body's motivation plus any footer, per the `commit` skill.

When the change or the facts move later, regenerate the whole body and comment
set from the new diff — do not patch one sentence and leave the rest stale.

## 6. Restack

A stacked pull request goes stale when its base moves. Restack it when the
user asks, or when step 1 finds that the base moved or merged. Without `gh`,
ask the user whether the base is merged.

1. `git fetch`. Base merged:
   `git rebase --onto origin/<default> <base's last commit>`, with the
   `headRefOid` from step 1, or `git merge-base HEAD origin/<base>` without
   `gh`. A squash merge puts the base's commits on the default branch under
   new hashes; this replays only this branch's own commits. Base moved:
   `git rebase origin/<base>`.
2. On a conflict, stop and show it; do not resolve it by picking a side.
3. Run the project's verification commands from its `CLAUDE.md`.
4. Ask before pushing: the push replaces the branch on the remote. Only after
   the user agrees, `git push --force-with-lease`, on this branch only.
5. Base merged: `gh pr edit --base <default>` (GitHub may have done it
   already). Then regenerate the body and comments from the new diff,
   without the `Stacked on` line, and show them as step 5 does.

Name the pull requests stacked on this one (`gh pr list --base <branch>`):
each needs `/mochi:pr` on its branch to restack it in turn.
