const { JSDOM } = require('jsdom');

process.stdin.on("data", data => {

  const html = data.toString()
  const dom = new JSDOM(html)

  const t = dom.window.document.querySelector('head title')
  if (t) {
    console.log(JSON.stringify(t.textContent.trim()))
    return
  }

  console.log(JSON.stringify(''))
  return

})