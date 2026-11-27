// SessionStart: tell Claude when the mochi option `autonomous` is on, so
// the skills take the autonomous answer at their reversible stops (see
// principles.md, "Autonomous mode"). Claude Code gives a plugin's hooks
// each option as CLAUDE_PLUGIN_OPTION_<KEY>. Prints nothing when it is off.
export const isOn = (value) => /^(true|1|on|yes)$/i.test(String(value ?? '').trim());

if (isOn(process.env.CLAUDE_PLUGIN_OPTION_AUTONOMOUS)) {
  console.log(
    'Mochi autonomous mode is on (the plugin option `autonomous`): at each stop that a mochi skill gives an autonomous answer, take that answer. A request that says "ask me" turns it off for that request.',
  );
}
