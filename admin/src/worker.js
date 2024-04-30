import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

const log = (...args) => postMessage({type: 'log', payload: args.join(' ')});
const error = (...args) => postMessage({type: 'error', payload: args.join(' ')});

// Initializes the Worker1 API (https://sqlite.org/wasm/doc/trunk/api-worker1.md#worker1)
// TODO: Use the promiser API
sqlite3InitModule({
  print: log,
  printErr: error,
}).then(sqlite3 => sqlite3.initWorker1API())