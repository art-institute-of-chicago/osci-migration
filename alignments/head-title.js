const { JSDOM } = require('jsdom');

(() => {

  process.stdin.once("readable", () => {

    // Basically just the node docs reader (https://nodejs.org/api/stream.html#event-readable) so we're OK re: buffering large STDINs
    // TODO: Return a promise or something so this can just be imported by other alignment scripts
    let data;
    let buf;

    // p. sure this read() is fully buffered but node docs show while..
    while ((data = process.stdin.read()) !== null) {
      buf += data.toString()
    }

    const dom = new JSDOM(buf)

    if (dom.window.document.title) {
      const result = { 'head_title': dom.window.document.title.trim() }
      process.stdout.write(JSON.stringify(result))
      return 
    }

    process.stdout.write(JSON.stringify({}))
    return

  })

})()
