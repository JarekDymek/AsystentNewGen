import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const handlers = {};
const removed = [];
let task;
vm.runInNewContext(fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), {
  self: { addEventListener: (name, handler) => { handlers[name] = handler; }, clients: { claim: async () => {} } },
  caches: {
    keys: async () => ['asystent-mow-newgen-v6', 'asystent-mow-newgen-v7', 'asmow-private-v77', 'asmow-open-v13'],
    delete: async name => { removed.push(name); },
  },
});
handlers.activate({ waitUntil: promise => { task = promise; } });
await task;
assert.deepEqual(removed, ['asystent-mow-newgen-v6']);
console.log('OK: aktualizacja usuwa wyłącznie własny stary cache.');
