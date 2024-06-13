/*
  parse-osci.js

  This alignment script takes in HTML from STDIN and parses it into OSCI content types.
  The input is: 
    - TODO: HTML Santitized (`dompurify`) -- sanitize errors are emitted on _meta._body_sanitize
    - Parsed into a DOM tree (`jsdom`)

*/

const { JSDOM } = require('jsdom');

/**
 * materializeType
 * @param {JSDOM} dom - JSDOM object, usually parsed from a string
 * 
 * Returns a string representing the type for this document
 */ 
const materializeType = (dom) => {
  switch ( dom.window.document.title.trim().toLowerCase() ) {
  case 'figure':
    return 'figure'
  case 'navigation':
    // TODO: Maybe should check nav @epub:type='toc' instead?
    return 'toc'
  }

  return 'text'
}

/**
 * parseFootnotes
 * @param {JSDOM.Document} doc - Deserialized HTML document, usually from JSDOM.window.document
 *   
 * Returns an array of objects representing each footnote from an OSCI text
 */ 
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

/**
 * parseTextSections
 * @param {JSDOM.Document} doc - Deserialized HTML document, usually from JSDOM.window.document
 * 
 * Returns an array of objects representing each section (with id, text, html, and blocks keys) from an OSCI text
 */ 
const parseTextSections = (doc,footnotes,figures) => {

  const sects = doc.querySelectorAll('section')
  let result = []

  sects.forEach( (s,i) => {

    // TODO: Just put these in the same place
    if (s.id === 'footnotes' || s.id === 'figures') { 
      return 
    }

    const id = s.id
    const text = s.textContent

    // TODO: Consider parsing further to handle footnote, figure refs, and internal pub links (eg, /reader/* -> /reader/* )
    // TODO: Consider stripping embedded @style attributes
    const html = s.innerHTML

    const blocks = parseBlocks({id,html,order: i},footnotes,figures)

    result.push({id,text,html,blocks})

  })

  return result
}

// * OSCI uses `section` tags to identify page sub-heads, so expose those minus `footnotes` and `figures`
/**
* parseFiguresSection
* @param {JSDOM.Document} doc - Deserialized HTML document, usually from JSDOM.window.document
*   
* Returns an array of objects representing each figure in an OSCI text
*/ 
const parseFiguresSection = (doc) => {

  const sect = doc.getElementById('figures')
  let result = []

  if (sect) {

    const figs = sect.querySelectorAll('figure')
    figs.forEach( (fig) => {

      const id = fig.id
      const title = fig.title
      const position = fig.dataset.position
      const columns = fig.dataset.columns // FIXME: Number()? Though it can also be 50% IIRC
      const figure_type = fig.dataset.figure_type
      const aspect = fig.dataset.aspect // FIXME: Number()? Check -- this may also have stringy values
      const options = fig.dataset.options // FIXME: JSON.parse()
      const order = fig.dataset.order // FIXME: Number()
      const count = fig.dataset.count // FIXME: Number()?

      // TODO: `figure_type` == html (or whatever it is) should parse slightly differently

      const thumbnail = fig.querySelector('img.thumbnail')?.src

      const layerObject = fig.querySelector('object')
      const figure_layer_url = layerObject?.getAttribute('data')

      const fallback = fig.querySelector('object > .fallback-content > img')
      const fallback_url = fallback?.src

      const caption = fig.querySelector('figcaption > div')
      const caption_html = caption?.innerHTML
      const caption_text = caption?.innerText

      // TODO: img alt text -- see https://publications.artic.edu/whistlerart/api/epub/paintingsanddrawings/51/content.xhtml?revision=1607615557#fig-51-27 ? I thought I saw this somewhere but I've only seen empty alts in samples

      result.push({id,title,thumbnail, figure_layer_url, fallback_url, caption_html, caption_text, position,columns,figure_type,aspect,options,order,count})

    })
  }

  return result
}

/**
* parseTocSections
* @param {JSDOM.Document} doc - Deserialized HTML document, usually from JSDOM.window.document
*   
* Returns an array of objects representing the Table of Contents hierarchy of an OSCI text (as a tree of objects)
*/ 
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

    const titlePattern = /(?:<!\[CDATA\[)(.+?)(?:<!--\]\])/g

    // TODO: Sanitize this embedded HTML
    // TODO: Create text-only representation of title (eg, html string -> dom node -> text content)
    const commentFrag = /(?<=\[CDATA\[)(\w.+?)(?:<!--]])/g

    let title = ''
    anchor.childNodes.forEach( n => {

      if (n.nodeType === doc.COMMENT_NODE && !commentFrag.test(n.textContent) ) { 
        return
      }

      if (n.nodeType === doc.COMMENT_NODE ) { 

        // FIXME: Despite being identical to the literal, `commentFrag` does not work here?
        const matches = [...n.textContent.matchAll(/(?<=\[CDATA\[)(\w.+?)(?:<!--]])/g)]
        if (matches.length > 0) {
          title += matches[0][1]
        }
        return
      }

      if ( n.outerHTML && n.outerHTML !== '<p></p>' ) {
        title += n.outerHTML      
        return
      } 

      if ( n.textContent && n.textContent !== '-->' ) {
        title += n.textContent
        return
      }

    })

    const url = anchor.href
    const id = `section-${anchor.dataset.section_id}` // NB: This is *not* namespaced!!
    const thumbnail = anchor.dataset.thumbnail 
    const subHeadings = JSON.parse(anchor.getAttribute('data-subHead')) // NB: getAttribute() because subHead doesn't pass dataset's camelCase/snake-case xform 

    const parsed = { id, url, title, thumbnail, subHeadings, subSections: parseTocSections(hdg) }
    sections.push(parsed)

  }

  return sections
}

/**
* parseBlocks
* @param {object} section - A section object output from `parseTextSection`
* @param {array} footnotes - footnotes from `parseFootnotes`
* @param {array} figures - figure data objects from `parseFiguresSection`
*   
* Returns an array of block objects (order, html, TODO: type) suitable for use with a Twill object that conforms to `hasBlocks`
* 
* Mostly this consists of:
* - Breaking up sections by paragraph tags
* - Inserting figures after they are used
*   - Or before the running text in the case of position=full|platefull
* - Replacing footnote anchor references (OSCI) with [ref] shortcodes (AIC/Twill)
*/ 
const parseBlocks = (section, footnotes, figures) => {

  const {id, html, order } = section

  const parser = new JSDOM(html)
  const sectionDoc = parser.window.document

  const plateFigureBlocks = (order === 0) ? figures.filter( (f) => f.position === "plate" || f.position === "platefull" )
                                    .map( (fig) => { return { ...fig, blockType: "figure" } } )
                                  : []

  // TODO: Pick a nice mod number (3?) and rotate the block size by it (circuitbreak by figure presence)

  // Mutates the DOM object represented by fnRef to replace it with [ref] shortcodes
  const replaceFootnoteAnchors = (fnRef) => {

      const url = new URL(fnRef.href)
      const fnoteId = url.hash.replace(/^#/,'')  

      const note = footnotes.find( (n) => n.id===fnoteId )
      if (note) {

        // FIXME: Hrm this was browser-fu it may have no power here..
        // Footnotes arrive <p>-wrapped, so grok their content and wrap with [ref] delimiters
        const templ = new JSDOM().window.document.createElement('template')
        templ.innerHTML = note.noteHtml

        const parNode = templ.content.querySelector('p')

        // NB: Notes have embedded markup so this must walk `childNodes` instead of `children` (`HTMLElement`s only)
        const noteNodes = Array.from(parNode?.childNodes?.values() ?? [])

        fnRef.replaceWith('[ref]',...noteNodes,'[/ref]')

      }

  }

  // Iterate the array of children and reduce it to an array of 
  const runningTextBlocks = Array.from(sectionDoc.body.children)
                          .reduce( (blocks,child) => {

    child.querySelectorAll('a[href^="#fn-"]').forEach( (fnRef) => replaceFootnoteAnchors(fnRef) )

    const figureRefs = Array.from(child.querySelectorAll('a[href^="#fig-"]')).map( (fg) => {
      const url = new URL(fg.href)
      return url.hash.replace(/^#/,'')  
    })

    const blockFigs = figureRefs.filter( (fig) => figures.some( (f) => f.id===fig && f.position !== 'plate' && f.position !== 'platefull' ) ).map( fig => {
      return { blockType: 'figure', ...figures.find( (f) => f.id===fig ) }
    })

    return [ ...blocks, { blockType: 'text', html: child.outerHTML }, ...blockFigs ]   

  },[])

  return [ ...plateFigureBlocks, ...runningTextBlocks ]

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

    // TODO: Wrap everything in try/catch and leave a dirty exit code + emit on stderr on fail
    // TODO: Relativize links in dom.window.document

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

      const figs = parseFiguresSection(dom.window.document)
      result.figures = figs

      const textSections = parseTextSections(dom.window.document,notes,figs)
      result.sections = textSections

      break
    }

    process.stdout.write(JSON.stringify(result))

  })

})()
