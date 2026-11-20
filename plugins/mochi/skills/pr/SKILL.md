---
name: pr
description: Open a pull request for the current branch — a body written from the final diff for a busy reviewer (a TL;DR and a Why that names each drift from the plan, and before and after screenshots for a UI change), plus one-line candidate self-review comments that the user picks from. Shows the draft before posting and creates the PR as a draft. Also restacks a pull request stacked on another one after its base moves or merges.
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
  (step 6). Otherwise offer to regenerate its body and its posted
  self-review comments.
- When `gh` is missing or not logged in, say so once and go on: take the
  base from the argument or `git symbolic-ref refs/remotes/origin/HEAD`, and
  write the draft. Only posting needs `gh`.

When the repo has a `.github/pull_request_template.md`, use its sections: a
project rule wins over the sections of step 3.

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

For a reviewer who arrives from a notification, the body has two sections,
and a Screenshots table after them when the user gives images:

- **TL;DR** — one or two sentences: what changes for whom. Add the link to
  the request, when there is one.
- **Why** — one paragraph for each decision and its reason, with the
  alternative that lost. The diff shows *what*; do not restate it. A settled
  decision goes here, with the plan's reason. When the code departs from the
  plan, say so, and give the reason from the commits or the plan. A drift
  is, for example, a different module, a different design, or a step that
  the code does not do. When neither gives a reason, ask the user in step 5.
- **Screenshots** — only when the user gives a before image and an after
  image: a table after the Why, with a Before column and an After column.
  Each image reference uses the absolute path of its image, in `<...>` when
  the path has a space: `![Before](</path/to/before.png>)`. In a
  regenerated body, keep the image URLs from `gh pr view --json body`.

Add no other section: no risk, reading order, review asks, test plan or
links. An open decision is a candidate comment (step 4). Step 5 owns an open
🟠 High or 🔴 Critical finding. Do not give a manual test checklist, in the
body or in the reply.

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

### Language

Write the body and the comments by the **Writing** section of
`${CLAUDE_PLUGIN_ROOT}/principles.md`: STE, in a UK English tone.

## 4. Offer candidate comments

The author fixes the review findings before the pull request, so most pull
requests need no self-review comment. Do not write the comments out. List
each candidate in one line, with its path and line:

- A decision that is still open: an open question of the plan, or a choice
  that the diff makes with low confidence and that nothing settled.
- A drift from the plan that a reviewer sees at one line.

Never a settled decision, and never an open review finding: a reviewer can
do nothing with "this PR or a follow-up?". Product or UX questions belong
elsewhere. With no candidate, say so in one line.

When the user picks a candidate, write it out at its line, and show it
before you post it:

- The first sentence is the ask: "Design decision for your opinion: …" or
  "Exception to the description: …".
- Concrete before/after against the base (a line new in this PR has no
  before), and the worst case in one sentence.
- Only diff-lifetime questions. Anything every future reader of the file
  needs belongs in the code (a name, a constant), or else in a source comment.

## 5. Show, then post

When a 🟠 High or 🔴 Critical finding is still open, name it first, and
offer to fix it before the pull request goes out. Until the user declines
the fix, the body does not mention it. When they decline, add one line to
the Why that names the known gap, and show the body again before you post.

When the diff changes markup or styles (templates, components, HTML, CSS)
and the user gave no images, offer in the reply to add a before and an
after screenshot. With that offer, and whenever the body has screenshots,
tell the user to check that the images show no customer data.

Show the title, the body word for word with its image references, and the
candidate comments in the reply. Ask which candidates to post, and ask the
reason for each drift that the commits and the plan do not give. Post only
after the user agrees. Without a working `gh`, also save the body to a file,
give its path and the commands below, and stop there:

```bash
gh pr create --draft --base <base> --title "<title>" --body-file <file> \
  --attach '<before path>#Before' --attach '<after path>#After'
gh api --method POST repos/{owner}/{repo}/pulls/<number>/reviews --input <review.json>
```

with `review.json` as
`{"event": "COMMENT", "comments": [{"path": "...", "line": N, "side": "RIGHT", "body": "..."}]}`.
Run the `gh api` command only when the user picked comments. Give the
`--attach` flags only with screenshots, each with the same absolute path as
its reference in the body. `gh` uploads each file and puts its URL in the
body. When an upload fails, `gh pr create` exits non-zero but still creates
the pull request and prints its URL: take the URL from the output, and
attach the missing image with `gh pr edit <number> --attach`.
Report the URL, and run `gh pr ready <number>` when the user says it is ready.
At squash merge, the final commit message is the PR title, and the extended
description is the body's Why plus any footer, per the `commit` skill.

When the change or the facts move later, regenerate the whole body and the
picked comments from the new diff — do not patch one sentence and leave the
rest stale.

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
   already). Then regenerate the body and the posted self-review comments
   from the new diff, without the `Stacked on` line, and show them as step 5
   does.

Name the pull requests stacked on this one (`gh pr list --base <branch>`):
each needs `/mochi:pr` on its branch to restack it in turn.
