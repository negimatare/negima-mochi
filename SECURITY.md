# Security policy

## Supported versions

Only the latest release of `mochi`, `mochi-react` and `mochi-python` gets
fixes. To get the latest release, run
`claude plugin update <plugin>@negima-mochi`. An install pinned to a tag
moves with the steps in the README Install section.

## Scope

The kit runs on your machine with your permissions. Its hooks run local
commands, and its skills tell Claude which commands to run. Report a problem
that lets the kit do one of these actions:

- Run a command that you did not approve.
- Obey an instruction in a file that it reads as data.
- Bypass the permission prompt of the dependency policy.
- Push to the default branch.
- Force-push without your approval.
- Send code, secrets or files to a location outside your machine.

## Report a vulnerability

Do not open a public issue. Use
[private vulnerability reporting](https://github.com/negimatare/negima-mochi/security/advisories/new).
This link opens the report form.

Include these items:

- The plugin and its version.
- Your Claude Code version.
- The steps or the request that shows the problem.
