# Security policy

## Supported versions

Only the latest release of `mochi`, `mochi-react`, and `mochi-python` gets
fixes. Run `claude plugin update <plugin>@negima-mochi` to get it.

## What counts

The kit runs on your machine with your permissions. Its hooks run local
commands, and its skills tell Claude which commands to run. Report anything
that lets the kit:

- run a command you did not approve, or one from a file it should only read
- skip the dependency policy's permission prompt
- push to the default branch, or force-push without asking
- send code, secrets, or files anywhere outside your machine

## Report a vulnerability

Please do not open a public issue. Use
[private vulnerability reporting](https://github.com/negimatare/negima-mochi/security/advisories/new)
instead: open the **Security** tab and choose **Report a vulnerability**.

Include the plugin and its version, your Claude Code version, and the steps
or the request that shows the problem.
