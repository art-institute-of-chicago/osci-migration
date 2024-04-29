const { JSDOM } = require('jsdom');

const materializeType = (dom) => {
  switch ( dom.window.document.title.trim().toLowerCase() ) {
  case 'figure':
    return 'figure'
  case 'navigation':
    return 'toc'
  }

  return 'text'
}

(() => {

  process.stdin.once("readable", () => {

    // Basically just the node docs reader (https://nodejs.org/api/stream.html#event-readable) so we're OK re: buffering large STDINs
    let data;
    let buf;

    // p. sure this read() is fully buffered but node docs show while..
    while ((data = process.stdin.read()) !== null) {
      buf += data.toString()
    }
    const dom = new JSDOM(buf)
    const type = materializeType(dom)
    const result = { "_type": type }

    if (dom.window.document.title) {
      result.head_title = dom.window.document.title.trim()
    }

    process.stdout.write(JSON.stringify(result))

  })

})()
