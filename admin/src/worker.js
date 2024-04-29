import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
// import dbFile from './data/migration.sqlite3?url'

const log = (...args) => postMessage({type: 'log', payload: args.join(' ')});
const error = (...args) => postMessage({type: 'error', payload: args.join(' ')});

// self.addEventListener("message", (msg) => { console.log('sup',msg) } )
// Lots of weirdness for importing, this is basically: https://sqlite.org/wasm/doc/trunk/cookbook.md#importing

// Mostly a customized reimplementation of the `Worker1PromiserAPI` in @sqlite.org/sqlite-wasm
// Open an URL by fetch as an in-memory instead of through the normal OPFS/in-memory/etc means

const start = (sqlite3) => {

  // fetch(dbFile)
  //   .then( res => res.arrayBuffer() )
  //   .then( (arrayBuffer) => {

  //     const p = sqlite3.wasm.allocFromTypedArray( arrayBuffer )
  //     const db = new sqlite3.oo1.DB(':memory:');
  //     const rc = sqlite3.capi.sqlite3_deserialize( db.pointer, 'main', p, arrayBuffer.byteLength, arrayBuffer.byteLength, sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE )
  //     db.checkRc(rc)

  //     dbs['main'] = db

  //   })  
}

// self.onmessage = function(event) {
//   const msg = event.data
//   switch (msg.type) {
//   case 'log':
//   case 'error':
//     console.log(msg)
//     break
//   case 'exec':
//     const db = dbs['main']
//     console.log(db)
//     console.log(msg.args.sql)
//     db.exec(msg.args.sql)
//   }
// }
sqlite3InitModule({
  print: log,
  printErr: error,
}).then(sqlite3 => sqlite3.initWorker1API())

// .then((sqlite3) => {
//   sqlite3.
//   start(sqlite3)
//   return sqlite3
// }).then( () => {
//   postMessage({type: 'sqlite3-api', result: 'worker1-ready'})
// })