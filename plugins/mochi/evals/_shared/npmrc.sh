# Sourced by each fixture with npm scripts; $1 is the folder of its package.json.
# In the eval sandbox, Node's spawn of `sh` by name fails with EPERM, and no network is available for the update check.
printf 'script-shell=/bin/sh\nupdate-notifier=false\n' > "${1:-.}/.npmrc"
