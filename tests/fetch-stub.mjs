// Replaces fetch for a test: STUB_TAG is the tag of the latest release, or
// "offline" for a request that fails.
globalThis.fetch = async () => {
  if (process.env.STUB_TAG === 'offline') throw new TypeError('fetch failed');
  return { ok: true, json: async () => ({ tag_name: process.env.STUB_TAG }) };
};
