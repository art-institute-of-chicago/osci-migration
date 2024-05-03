/*
  parse-osci.js

  This alignment script takes in HTML from STDIN and parses it into OSCI content types.
  The input is: 
    - TODO: HTML Santitized (`dompurify`) -- sanitize errors are emitted on _meta._body_sanitize
    - Parsed into a DOM tree (`jsdom`)

*/

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

// OSCI uses `section` tags to identify page sub-heads, so expose those minus `footnotes` and `figures`
const parseTextSections = (doc) => {

  const sects = doc.querySelectorAll('section')
  let result = []

  sects.forEach( (s) => {

    // TODO: Just put these in the same place
    if (s.id === 'footnotes' || s.id === 'figures') { 
      return 
    }

    const id = s.id
    const text = s.textContent

    // TODO: Consider parsing further to handle footnote, figure refs, and internal pub links (eg, /reader/* -> /reader/* )
    // TODO: Consider stripping embedded @style attributes (are these only style="text-align: left"??)
    const html = s.innerHTML

    result.push({id,text,html})

  })

  return result
}

const parseFiguresSection = (doc) => {

  const sect = doc.getElementById('figures')
  let result = []

  if (sect) {
    const figs = sect.querySelectorAll('figure')
    figs.forEach( (fig) => {

      const id = fig.id
      const title = fig.title
      const position = fig.dataset.position
      const columns = fig.dataset.columns // FIXME: Number()
      const figure_type = fig.dataset.figure_type
      const aspect = fig.dataset.aspect // FIXME: Number()
      const options = fig.dataset.options // FIXME: JSON.parse()
      const order = fig.dataset.order // FIXME: Number()
      const count = fig.dataset.count // FIXME: NUmber()

      const thumbnail = fig.querySelector('img.thumbnail').src
      const figure_layer_url = fig.querySelector('object').getAttribute('data')
      const fallback_url = fig.querySelector('object > .fallback-content > img').src
      const caption_html = fig.querySelector('figcaption > div').innerHTML
      const caption_text = fig.querySelector('figcaption > div').innerText

      // TODO: img alt text -- see https://publications.artic.edu/whistlerart/api/epub/paintingsanddrawings/51/content.xhtml?revision=1607615557#fig-51-27 ? I thought I saw this somewhere but I've only seen empty alts in samples

      result.push({id,title,thumbnail, figure_layer_url, fallback_url, caption_html, caption_text, position,columns,figure_type,aspect,options,order,count})

    })
  }

  return result
}

const parseTocSections = (doc) => {

  // TODO: Consider destructuring sections array and passing a tree of section ids
  let sections = []

  const headingsList = doc.querySelector('ol')
  if (headingsList===null) {return sections}

  // We only want immediate descendant `li` tags so just walk `children`
  for ( const hdg of Array.from(headingsList.children) ) {

    if (hdg.tagName !== 'LI') { 
      return 
    }

    const anchor = hdg.querySelector('a')

    if (!anchor) { 
      return 
    }

    // const paraFrag = /(^\[CDATA\[<p)/g
    // const tailFrag = /(\]\]>$)/g
    // Now we've got the TOC anchors, but things get a little wonky because they're all CDATA tags embeded in comments

    // TODO: Sanitize this embedded HTML
    // TODO: Create text-only representation of title (eg, html string -> dom node -> text content)
    const commentFrag = /(\[CDATA\[)(.+)/g

    let title = ''
    anchor.childNodes.forEach( n => {

      if (n.nodeType === doc.COMMENT_NODE && !commentFrag.test(n.textContent) ) { 
        return
      }

      if (n.nodeType === doc.COMMENT_NODE ) { 
        // TODO: Handle embedded content nodes ala `Collectors` subheds
        return
      }

      if ( n.outerHTML ) {
        title += n.outerHTML      
      } else {
        title += n.textContent
      }
    })

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

  let buf;

  // Basically just the node docs reader (https://nodejs.org/api/stream.html)
  // Reads data into a buffer until "end" event, then DOM parses and uses results
  process.stdin.on("data", (data) => {

    if (data !== null) {
      buf += data.toString()      
    }

  }).on("end", () => {

    const dom = new JSDOM(buf)
    const type = materializeType(dom)
    const result = { "_type": type }

    if (dom.window.document.title) {
      result._title = dom.window.document.title.trim()
    }

    switch (type) {
    case 'toc':
      const tocSections = parseTocSections(dom.window.document) 
      result.sections = tocSections
      break
    case 'figure':
      break
    case 'text':
      const notes = parseFootnotes(dom.window.document)
      result.footnotes = notes

      const textSections = parseTextSections(dom.window.document)
      result.sections = textSections

      const figs = parseFiguresSection(dom.window.document)
      result.figures = figs

      break
    }

    process.stdout.write(JSON.stringify(result))

  })

})()
