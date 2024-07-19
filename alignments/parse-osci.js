/*
  parse-osci.js

  This alignment script takes in HTML from STDIN and parses it into OSCI content types.
  The input is: 
    - TODO: HTML Santitized (`dompurify`) -- sanitize errors are emitted on _meta._body_sanitize
    - Parsed into a DOM tree (`jsdom`)
    - TODO: glossary_align -- use jsdom to turn dl/dt/dd tags into json term / description things useful as a detail/summary tags in review

*/

const { JSDOM } = require('jsdom');

const parseFigureLayer = (dom) => {

  const div = dom.querySelector('div > ul') // TODO: `div > ul.layered_image-layers`
  const layerItems = div.querySelectorAll('li')

  let result = { _type: "figure", _aspect: Number(div.dataset.aspect) }

  let items = []
  layerItems.forEach( (li) => {

    items.push({
      _type: li.dataset.type,
      _title: li.dataset.title,
      _height: Number(li.dataset.height),
      _width: Number(li.dataset.width),
      _layer_id: li.dataset.layer_id,
      _layer_num: li.dataset.layer_num,
      _static_url: li.dataset.image_path,
      _image_ident: li.dataset.ptiff_path,
      _image_url_stem: li.dataset.ptiff_server,
      _zoom_levels: li.dataset.zoom_levels,
      _thumbnail: li.dataset.thumb,
      _svg_path: li.dataset.svg_path
    }) 

  })

  result.layers = items
  return result

}

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
      const noteText = note.textContent

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
  
  let figs = figures 
  let result = []

  // Walk each section, capture the basic data, then attempt to parse
  // TODO: strip section text/html 
  sects.forEach( (s,i) => {

    if (s.id === 'footnotes' || s.id === 'figures') { 
      return 
    }

    const id = s.id
    const text = s.textContent
    const html = s.innerHTML

    const blocks = parseBlocks({id,html,order: i},footnotes,figs)

    // Remove figures from the list so we don't double-insert figs
    const placedFigs = figures.filter( f => blocks.some( b => b.id===f.id) ).map( f => f.id )
    figs = figs.filter( f => !placedFigs.includes(f.id) )

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
      const columns = fig.dataset.columns
      const figure_type = fig.dataset.figure_type
      const aspect = Number.parseFloat(fig.dataset.aspect)

      let options = {}

      try {
        options = JSON.parse(fig.dataset.options)
      } catch {
        options = {}
      }

      const order = fig.dataset.order // FIXME: Number()?
      const count = fig.dataset.count // FIXME: Number()?

      let html_content
      let html_content_src 

      const contentElem = fig.querySelector('.figure_content')

      switch (figure_type) {
        case 'html_figure':

          // Parse for embedded figure HTML and for their src (if one exists--eg, youtube) 
          if (contentElem) { 

            const embed = contentElem.querySelector('embed') ?? contentElem.querySelector('iframe')

            html_content = contentElem.innerHTML

            if (embed && embed.getAttribute('src')) {
              html_content_src = embed.getAttribute('src')
            }
          }
          break
        case '360_slider':
          // TODO: Unpack contentElem's src files dir, start, end, width, height, prefix so someone can do something with it later
          break
        case 'iip_asset': 
        case 'layered_image':
          // NB: We already grab layer urls as figure_layer_url below
          break
        case 'rti_viewer':
          // TODO: Unpack contentElem's height, width, rti-url, rti-name
          break
      }

      const thumbnail = fig.querySelector('img.thumbnail')?.src

      const layerObject = fig.querySelector('object')
      const figure_layer_url = layerObject?.getAttribute('data')

      const fallback = fig.querySelector('object > .fallback-content > img')
      const fallback_url = fallback?.src

      const caption = fig.querySelector('figcaption > div')
      const caption_html = caption?.innerHTML
      const caption_text = caption?.innerText

      // TODO: img alt text -- see https://publications.artic.edu/whistlerart/api/epub/paintingsanddrawings/51/content.xhtml?revision=1607615557#fig-51-27 ? I thought I saw this somewhere but I've only seen empty alts in samples

      result.push({id,title,thumbnail, figure_layer_url, fallback_url, caption_html, caption_text, position,columns,figure_type,aspect,options,order,count,html_content,html_content_src})

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
 * replaceFootnoteAnchors
 * @param {Node} fnRefAnchor - an OSCI footnote anchor to replace
 * @param {array} footnotes - footnotes for this section
 * 
 * Replaces the anchor footnote reference with [ref]-wrapped shortcodes
 * NB: Will mutate `fnRefAnchor` even in a static NodeList due to `replaceWith()`
 * 
 **/
const replaceFootnoteAnchors = (fnRefAnchor,footnotes) => {

    const fnRefHref = new URL(fnRefAnchor.href)
    const fnoteId = fnRefHref.hash.replace(/^#/,'')  

    const note = footnotes.find( (n) => n.id===fnoteId )

    if (note) {

      // Footnotes arrive <p>-wrapped, so grok their content and wrap with [ref] delimiters
      const br = JSDOM.fragment('<br>')
      const noteFrag = JSDOM.fragment(note.noteHtml)

      const parNodes = noteFrag.querySelectorAll('p')

      let noteNodes = []

      // Walk the footnote's par nodes and then walk their childNodes (NB: must be childNodes to get Text nodes as well, must be iterated to be copied)
      parNodes.forEach( p => {

        // Create a line break between footnote paras
        if (noteNodes.length > 0) {
          noteNodes.push( br.cloneNode() )
        }

        for (let n of p.childNodes.values()) {

          // Trim whitespace -- since all OSCI content comes in as HTML it can have wildly differing spacing
          switch (n.nodeType) {
            case n.TEXT_NODE:

              // NB: not ideal (all whitespace becomes one space) but better for now than full removal
              const frag = JSDOM.fragment(n.nodeValue.replace(/^\s+|\s+$/g," "))
              noteNodes.push(frag)
              break
            default:
              noteNodes.push(n)
              break
          }


        }

      })

      fnRefAnchor.replaceWith('[ref]',...noteNodes,'[/ref]')

    }

}

/**
* parseBlocks
* @param {object} section - A section object output from `parseTextSection`
* @param {array} footnotes - footnotes from `parseFootnotes`
* @param {array} figures - figure data objects from `parseFiguresSection`
*   
* Returns an array of block objects (order, html, type) suitable for use with a Twill object that conforms to `hasBlocks`
* 
* Mostly this consists of:
* - Breaking up sections by paragraph tags
* - Inserting figures after they are used
*   - Or before the running text in the case of position=full|platefull
* - Replacing footnote anchor references (OSCI) with [ref] shortcodes (AIC/Twill)
*/ 
const parseBlocks = (section, footnotes, figures) => {

  const {id, html, order } = section

  const sectionFrag = JSDOM.fragment(html)

  // Reducer that runs across all children of `section` tags in this document:
  // - Replaces OSCI-style `.fn-ref` footnotes with AIC-style [ref][/ref] shortcodes
  // - Strips embedded styling
  // - Drops OSCI `a.anchor-link` hidden anchor tags
  // - Strips HTML whitespace to prep for pseudo-HTML whitespace (TODO--too much stripped) 
  // - Collates OSCI paras into larger blocks, breaking heading tags

  const collateBlocks = (blocks,sectionPara) => {

      // Replace footnotes w/ shortcodes
      sectionPara.querySelectorAll('a[href^="#fn-"]').forEach( (fnRef) => {
        replaceFootnoteAnchors(fnRef,footnotes)
      })

      // Strip embedded styling
      let clean = sectionPara.cloneNode(true)
      clean.removeAttribute('style')

      headingTags = ['h1','h2','h3','h4','h5','h6']
      const tagName = sectionPara.tagName.toLowerCase()
      const prevTagName = blocks.length > 0 ? blocks[blocks.length - 1].tagName.toLowerCase() : undefined

      // Clamp heading level to h4
      if (tagName==='h5' || tagName==='h6') {
        let frag = JSDOM.fragment(`<h4>${clean.innerHTML}</h4>`)
        clean = frag.firstChild
      }

      switch (true) {
        case (sectionPara.tagName.toLowerCase() === 'a' && sectionPara.classList.contains('anchor-link') ):
          return blocks

        case (blocks.length===0):
          // Add the block if there are none
          return [{ blockType: 'text', html: clean.outerHTML, tagName }]
        
        case (headingTags.includes(tagName) && !headingTags.includes(prevTagName) ):
          // Begin a new block if this is a header and we didn't see a header last
          return [ ...blocks, { blockType: 'text', html: clean.outerHTML, tagName } ]
        
        case (headingTags.includes(tagName) && headingTags.includes(prevTagName) ):
          // Add to the block without p-wrapping if it's another header
          return [ ...blocks.slice(0,-1), { blockType: 'text', html: blocks[ blocks.length - 1 ].html.concat( clean.outerHTML ), tagName } ]
        
        case (tagName === 'p') && blocks.length > 0:
          const prev = blocks[ blocks.length - 1 ]
          return [ ...blocks.slice(0,-1), {...prev, html: prev.html.concat( clean.outerHTML ), tagName }]
        
        case (clean.outerHTML === undefined):
          return blocks

        default:
          // Everything else needs to be wrapped in a p-tag
          const prevBlock = blocks[ blocks.length - 1 ]
          return [ ...blocks.slice(0,-1), {...prevBlock, html: prevBlock.html.concat( `<p>${clean.outerHTML}</p>` ), tagName }]

      }

  }

  // Inserts figure blocks for each referenced figure in `textBlock`, a text block
  const insertFigures = (blocks,textBlock) => {

    const block = new JSDOM(textBlock.html).window.document

    // Find all figure references
    const figureRefs = Array.from(block.querySelectorAll('a[href^="#fig-"]')).map( (fg) => {
      const url = new URL(fg.href)
      return url.hash.replace(/^#/,'')  
    })

    // And create blocks for not-yet-inserted figs using their data
    const blockFigs = figureRefs.filter( (fig) => !blocks.some( b => b.blockType === 'figure' && b.id === fig.id ) && figures.some( (f) => f.id===fig && f.position !== 'plate' && f.position !== 'platefull' ) ).map( fig => {
      return { blockType: 'figure', ...figures.find( (f) => f.id===fig ) }
    })

    return [ ...blocks, textBlock, ...blockFigs ]
  }

  // Break up into blocks and then insert figures (first referenced, then unreferenced)

  const plateFigureBlocks = (order === 0) ? figures.filter( (f) => f.position === "plate" || f.position === "platefull" )
                                    .map( (fig) => { return { ...fig, blockType: "figure" } } )
                                  : []

  const textBlocks = Array.from(sectionFrag.children)
                          .reduce( collateBlocks, [] )
  const textAndRefdFigureBlocks = textBlocks.reduce( insertFigures, [] )
  const unreferencedFigures = figures.filter( f => !textAndRefdFigureBlocks.some( b => b.blockType === 'figure' && b.id === f.id && ( f.position !== 'plate' && f.position !== 'platefull' ) ) ).map( f => { return { ...f, blockType: 'figure' } })

  // TODO:
  // insert unreferencedFigures if they exist

  return [ ...plateFigureBlocks, ...textAndRefdFigureBlocks ] // TODO: , ...unreferencedFigures ]

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

    // FIXME: Regex out JSDOM-unprocessable self-closing anchor tags!!
    const anchorless = buf.replaceAll(/<a .+?anchor-link.+?\/>/g,'').replaceAll(/\n/g,'')
    const dom = new JSDOM(anchorless)
    const type = materializeType(dom)
    let result = { "_type": type }

    if (dom.window.document.title) {
      result._title = dom.window.document.title.trim()
    }

    // TODO: Wrap everything in try/catch and leave a dirty exit code + emit on stderr on fail
    // TODO: Relativize links in dom.window.document -- maybe stub by section id from the URL path?

    switch (type) {
    case 'toc':
      const tocSections = parseTocSections(dom.window.document) 
      result.sections = tocSections
      break
    case 'figure':
      result = { ...result, ...parseFigureLayer(dom.window.document) }
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
