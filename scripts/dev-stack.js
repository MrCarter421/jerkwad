#!/usr/bin/env node
// ============================================================================
// The whole multiplayer system on localhost, to play by hand.
//
//   node scripts/dev-stack.js
//
// Serves this checkout's pages and engine, and runs workers/doom-relay under
// workerd — the same file Cloudflare runs, unmodified. Open the printed URL in
// two browser windows (two different browsers is the better test): GENERATE →
// tick Public → PLAY in one, JOIN in the other.
//
//   node scripts/dev-stack.js --chaos     # put the chaos proxy in front of the
//                                         # relay; then, while playing, type:
//                                         #   stall 5   hold all traffic 5 s
//                                         #   kill 1    player 2's link dies silently
//                                         #   reset     tear every link down
//   WORKER=/path/old-index.mjs node scripts/dev-stack.js   # another relay build
//   ENGINE=/dir node scripts/dev-stack.js                  # another engine build
//
// Nothing here touches the deployed site or the deployed relay.
// ============================================================================
'use strict';
const path = require('path');
const readline = require('readline');
const { startStack } = require('./lib/stack');

const env = process.env;
const chaos = process.argv.includes('--chaos');

(async () => {
  let stack;
  try {
    stack = await startStack({
      port: +(env.PORT || 8188), relayPort: +(env.RELAY_PORT || 8787), chaos, chaosPort: +(env.CHAOS_PORT || 8786),
      worker: env.WORKER ? path.resolve(env.WORKER) : undefined,
      engineDir: env.ENGINE ? path.resolve(env.ENGINE) : undefined,
    });
  } catch (e) {
    console.error(e.code === 'NO_DEP' ? e.message + '\nRun `npm install` in the repo root first.' : e);
    process.exit(e.code === 'NO_DEP' ? 2 : 1);
  }
  console.log('\n  JerkWad local stack');
  console.log('    arena   ' + stack.arenaUrl);
  console.log('    relay   ' + stack.relayOrigin + '   (' + path.relative(process.cwd(), stack.worker) + ' under workerd)');
  console.log('\n  Open the arena URL in two windows. Ctrl-C to stop.');
  if (chaos) {
    console.log('\n  chaos proxy is in the path. Commands:  stall <seconds> | kill <0=host,1=joiner> | reset');
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', (line) => {
      const [cmd, arg] = line.trim().split(/\s+/);
      if (cmd === 'stall') { stack.chaos.stall((+arg || 5) * 1000); console.log('  holding all relay traffic for ' + (+arg || 5) + 's'); }
      else if (cmd === 'kill') console.log('  ' + stack.chaos.kill(arg === undefined ? undefined : +arg) + ' connection(s) now silently dead');
      else if (cmd === 'reset') console.log('  ' + stack.chaos.reset() + ' connection(s) reset');
      else if (cmd) console.log('  ? stall <seconds> | kill <0|1> | reset');
    });
  }
  const stop = async () => { await stack.close(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
})();
