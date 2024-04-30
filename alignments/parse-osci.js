const { JSDOM } = require('jsdom');

// TODO: Wrap everything in try/catch so we can leave a dirty exit code on fail
// TODO: Emit to stderr on error

const materializeType = (dom) => {
  switch ( dom.window.document.title.trim().toLowerCase() ) {
  case 'figure':
    return 'figure'
  case 'navigation':
    // FIXME: Maybe should check nav @epub:type='toc' instead?
    return 'toc'
  }

  return 'text'
}

const parseFootnotes = (doc) => {

  let footnotes = []
  const section = doc.querySelector('section#footnotes')

  if (section) {
    const notes = section.querySelectorAll('aside.footnote')
    notes.forEach( (note) => {

      const id = note.id
      const index = note.dataset.footnote_index
      const noteHtml = note.innerHTML

      const par = note.querySelector('p')
      const noteText = par.textContent

      const parsed = { id, index, noteHtml, noteText }
      footnotes.push(parsed)

    })
  }

  return footnotes
}

// For now just parse texts into Sections?
const parseTextSections = (doc) => {

}

const parseTocSections = (doc) => {
  // TODO: Consider destructuring sections array and passing a tree of section ids
  let sections = []

  const headingsList = doc.querySelector('ol')
  if (headingsList===null) {return sections}

  // We only want immediate descendant `li` tags so just walk `children`
  for ( const hdg of Array.from(headingsList.children) ) {

    if (hdg.tagName !== 'LI') { return }
    const anchor = hdg.querySelector('a')

    if (!anchor) { return }

    const title = anchor.textContent // FIXME: This probably fails do the CDATA wrapping
    const url = anchor.href
    const id = anchor.dataset.section_id
    const thumbnail = anchor.dataset.thumbnail 
    const subHeadings = JSON.parse(anchor.getAttribute('data-subHead')) // NB: getAttribute() because subHead doesn't pass dataset's camelCase/snake-case xform 

    const parsed = { id, url, title, thumbnail, subHeadings, subSections: parseTocSections(hdg) }
    sections.push(parsed)

  }

  return sections
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

    switch (type) {
    case 'toc':
      const sections = parseTocSections(dom.window.document) 
      result.sections = sections
      break
    case 'figure':
      break
    case 'text':
      const notes = parseFootnotes(dom.window.document)
      result.footnotes = notes
      break
    }

    process.stdout.write(JSON.stringify(result))

  })

})()
