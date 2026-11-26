---
name: pr
description: Open a pull request for the current branch — a body written from the final diff for a busy reviewer (a TL;DR and a Why that names each drift from the plan, and before and after screenshots for a UI change), plus one-line candidate self-review comments that the user picks from. Shows the draft before posting and creates the PR as a draft. Also restacks a pull request stacked on another one after its base moves or merges, through gh stack when it is set up.
argument-hint: "[optional: base branch, tracker ID, links]"
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/stack-check.mjs *), Bash(node ${CLAUDE_SKILL_DIR}/scripts/pushed.mjs *)
disable-model-invocation: true
---

# Pull request

The user's notes: `$ARGUMENTS`

## 1. Check

- Tracked files are clean (`git status --porcelain --untracked-files=no`).
  Otherwise run the `commit` skill first.
- The branch is pushed and up to date with its upstream. If not, ask before
  pushing — publishing is the user's call. A stacked branch that has
  diverged from its upstream is restacked instead (below). Run the
  **push checks** before each push that this skill makes, because each push
  feeds a pull request that exists or that this skill opens: the project's
  verification commands from its `CLAUDE.md`, and its "Before a push to an
  open PR" list. A failure stops the push: name the command that failed,
  and push only when the user says so. When the `CLAUDE.md` has no such
  list, say so one time and suggest `/mochi:setup-project`.
- The base is the argument, else the default branch
  (`gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`), and it
  differs from the current branch. A base other than the default branch is
  the branch of the part below: this pull request is **stacked** on it.
- No PR exists yet (`gh pr view`). If one does, its base is the PR's
  `baseRefName`, and the steps below offer to regenerate its body and its
  posted self-review comments.
- A stacked branch is restacked (step 6), before the steps below, when the
  **stack check** finds a reason. After a `git fetch`, run
  `node ${CLAUDE_SKILL_DIR}/scripts/stack-check.mjs <base>` on this branch.
  It prints one JSON object:
  - `restack` lists the reasons: the base's PR is merged (`base-merged`),
    `origin/<base>` is gone (`base-gone`), the base has commits this branch
    lacks (`base-moved`), the local base is ahead of `origin/<base>`
    (`base-ahead`: a review fix on the base waits for its push), or this
    branch and its upstream have diverged (`diverged`: a review fix on the
    base leaves this state after its local restack). Restack when the list
    is not empty.
  - `merged: null` means that gh cannot tell. Ask the user whether the base
    is merged, unless the arguments say so; `base-gone` makes a merge
    likely. Step 6 takes the base's last commit from `headRefOid`.
  - When `lost` is not empty, another person pushed to this branch, and the
    restack push would delete those commits: stop, show them, and restack
    nothing.

  When the script exits with an error, show its message and stop.
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
and a Screenshots table after them when the user gives images. Without a
repo template, fill `${CLAUDE_SKILL_DIR}/assets/pr-body.md`, and keep its
headings and its footer. With a repo template, fill the repo template, and
add only the footer of `pr-body.md`:

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
  Without images, remove the section.
- **Footer** — the rule and the `🍁 Generated with` line of `pr-body.md`,
  at the end of each body. It replaces any other "Generated with" line.

Add no other section: no risk, reading order, review asks, test plan or
links. An open decision is a candidate comment (step 4). Step 5 owns an open
🟠 High or 🔴 Critical finding. Do not give a manual test checklist, in the
body or in the reply.

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
description is the body's Why plus any commit footer (`BREAKING CHANGE:`,
`Refs:`), per the `commit` skill. It never gets the `🍁` line.

When the change or the facts move later, regenerate the whole body and the
picked comments from the new diff — do not patch one sentence and leave the
rest stale.

After a stacked pull request is created, and before any part of the stack
merges, put the branch in a local stack when `gh stack --version` and
`gh auth status` pass:

First switch to the base, run `gh stack view --short`, and switch back:
`gh stack view` takes no branch and shows the stack of the current branch.

- The base is in no local stack: `gh stack init <branches>`, with every
  branch of the stack from the bottom to this one. Follow each PR's
  `baseRefName` down to the default branch to find them.
- The base is the top branch of a local stack: switch to it, run
  `gh stack add <branch>`, and switch back.
- The base is in a local stack, but not at its top: another branch is
  already stacked on the base, and `add` would put this branch on that
  branch. Do not add it: use the git steps of step 6 for this branch.
- Then run `gh stack link <PR URLs>`, with the URL of every PR of the stack,
  from the bottom to the top. Give URLs, never branch names: `link` pushes
  the branches that it gets as names.

When `init` or `add` fails, report the error, and use the git steps of
step 6 for this stack. When only `link` fails, report it: the local stack
still restacks, and each PR shows its base branch.

## 6. Restack

A stacked pull request goes stale when its base moves. Restack it when the
user asks, or when step 1 finds a reason. Without `gh`, ask the user whether
the base is merged.

**The stack check** passes when `gh stack --version` and `gh auth status`
pass, and `gh stack view` shows this branch in a local stack. The `review`
skill reads this check too. When `gh stack --version` fails, say one time
that `gh extension install github/gh-stack` adds it. When the check passes,
restack the whole stack with `gh stack`:

1. `gh stack rebase`. It rebases each branch onto the one below it, and onto
   the default branch after a base merges. When it refuses to start because
   of untracked files, name them, and ask in one question whether to stash
   them (`git stash push --include-untracked`, and `git stash pop` after the
   restack) or to use the git steps.
2. On a conflict, first show it: the conflicting files
   (`git diff --name-only --diff-filter=U`) and their hunks. Then run
   `gh stack rebase --abort`, which restores every branch. Do not resolve
   the conflict by picking a side.
3. For each rebased branch, switch to it and run the push checks. Then switch
   back.
4. Ask one time before you push, and name each branch that the push replaces
   on the remote. Only after the user agrees, run `gh stack push`. Then run
   `node ${CLAUDE_SKILL_DIR}/scripts/pushed.mjs <branch>...` with each
   branch of the stack: `gh stack push` can report success and push
   nothing. When it names a branch that did not move, name each such branch
   and stop. Do not push it in a different way.

When the check fails, restack this branch with git:

1. `git fetch`. Base merged:
   `git rebase --onto origin/<default> <base's last commit>`, with the
   `headRefOid` of the stack check, or `git merge-base HEAD origin/<base>`
   when it is null. A squash merge puts the base's commits on the default branch under
   new hashes; this replays only this branch's own commits. Base moved:
   `git rebase <base>` when the local base is ahead of `origin/<base>` (a
   review fix that is not pushed yet), else `git rebase origin/<base>`.
2. On a conflict, stop and show it; do not resolve it by picking a side.
3. Run the push checks on this branch. When the local base is ahead, switch
   to it, run them there too, and switch back.
4. Ask one time before pushing: the push replaces the branch on the remote.
   When the local base is ahead, the same question names its push too. Only
   after the user agrees, push the base with `git push origin <base>` (a
   fast-forward, never forced), then this branch with
   `git push --force-with-lease --force-if-includes -u origin <branch>`:
   git then also refuses a push that would delete a commit that this branch
   never had.

After either path:

- Base merged: `gh pr edit --base <default>` (GitHub may have done it
  already). Then regenerate the body and the posted self-review comments
  from the new diff, and show them as step 5 does.
- After the git steps, name the pull requests stacked on this one
  (`gh pr list --base <branch>`): each needs `/mochi:pr` on its branch to
  restack it in turn.
