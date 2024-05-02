import { useEffect, useState, useMemo } from 'react'
import './App.css'

import dbFile from './data/migration.sqlite3?url'

function Pagination(props: any) {

  // NB: `current` is 0-indexed while `pages` and `p` are 1-indexed!!
  const { current, count, pageSize, setCurrent } = props
  const pages = Math.ceil( count / pageSize )
  const centerPage = Math.floor( pages / 2 )

  // Returns an array of pagination items for bulma's pagination
  const pagesToPagination = (pages: number,current: number) => {

    const ellipsesAbove = 7 // The smallest ellipsed pagination is length 7: [0] + [ ... ] + [<center 3 numbers>] + [...] + [last]
    if (pages <= ellipsesAbove) {
      return [...Array(pages).keys()]
    }

    // TODO: A little rough here if you're on p = 1 or p = pages - 2
    // TODO: Drop the page nums on mobile, next/prev take over full width
    // Capture the center three numbers
    const center: ( string | number )[] = current < 1 ? [ centerPage - 1, centerPage, centerPage + 1 ] : [ current - 1 , current, current + 1  ] 
    return [0,'...'].concat(center).concat(['...',pages-1]) 
  }

  return <nav className="pagination" role="navigation" aria-label="pagination">
            <a className={`pagination-previous ${ current > 0 ? '' : 'is-disabled' }`} onClick={ () => setCurrent(current-1) } href="#">Previous</a>
            <a className={`pagination-next ${ (current + 1) < pages ? '' : 'is-disabled' }` } onClick={ () => setCurrent(current+1) }  href="#">Next page</a>
            <ul className="pagination-list">
              {
                pagesToPagination(pages,current).map( (p) => {
                    if (typeof p === 'string' && p === '...') {
                      return <li><span className="pagination-ellipsis">&hellip;</span></li>
                    } 

                    if (typeof p === 'number') {
                      return <li>
                            <a href="#" className={`pagination-link ${ current === p ? 'is-current' : '' }`} aria-label={`Goto page ${p+1}`} onClick={ () => setCurrent(p) }>{p+1}</a>
                            </li>                      
                    }

                    return ''

                })
              }
         </ul>
          </nav>
}

function SortedHeaderLabel(props: any) {
  return <span className='icon-text'><span>{props.children}</span><span className={`icon ${props.showIcon ? '' : 'is-hidden' }`}>{ props.order === 'ASC' ? '⬆' : '⬇' }</span></span>
}

function SelectedTocView(props: any) {

  const { data } = props

  const tocSection = (sect: any) => {

    const { title, url, thumbnail, subHeadings, subSections } = sect

    const subheads = subHeadings ?? []
    const subsects = subSections ?? []

    const handleSelection = (url: string,event: any) => {
      event.preventDefault()
      props.setSelected(url)
    }

    return <article className='media'>
              <figure className={ `media-left ${thumbnail ? '' : 'is-hidden'}` }>
                <p className="image is-96x96">
                  <a href='#' onClick={ (e) => handleSelection(sect.url,e) }>
                    <img src={thumbnail} />
                  </a>
                </p>
              </figure>
              <div className='media-content'> 
                <div className='content'>
                  <p>
                    <strong>{title}</strong>
                    <br/>
                    <p  className={ subheads.length > 0 ? '' : 'is-hidden' } >Sub-Headings</p>
                    <dl className={ subheads.length > 0 ? '' : 'is-hidden' } >
                      { 
                        subheads.map( (sh: any) => {
                          return <><span className='is-text-weight-semibold'>{sh.id}:</span>&nbsp;<span>{sh.label}</span><br/></>
                        }) 
                      }
                    </dl>
                    <small><a href='#' onClick={ (e) => handleSelection(url,e) }>View</a>&nbsp;|&nbsp;<a href={url} target="_blank">View raw</a></small>
                  </p>
                </div>
                {subsects.map( (s: any) => tocSection(s) )}                
              </div>
          </article>

  }

  return <div className='selected-toc-view'>
                <h2 className='title'>Table of Contents for {data.package}</h2>
                <div className='subtitle'><a href={data.url} target='_blank'>View raw</a></div>
                {
                  'sections' in data ? data.sections.map( (sect: any) => tocSection(sect) ) : ''
                }
              </div>

}

function SelectedTextView(props: any) {

  const { id, url, title, sections: sects, footnotes: fnotes, figures: figs } = props.data

  const sections = ( sects ?? [] ).map( (sect: any) => {

    const { id, html } = sect

    return <section className={`section ${id}-section`}>
      <h3 className='title'>{id}</h3>
      <div className="ml-3 content" dangerouslySetInnerHTML={{ __html: html }}></div>
    </section>
  })

  const footnotes = ( fnotes ?? [] ).map( (fn: any) => {

    return <article className='media' id={fn.id}>
              <div className='media-left'>
                <span className='is-text-weight-semibold'>{fn.index}</span>
              </div>
              <div className='media-content'>
                <div className='content' dangerouslySetInnerHTML={{ __html: fn.noteHtml}}>
                </div>
              </div>
            </article>
  })

  const figures = ( figs ?? [] ).map( (fig: any) => {
    return <article className='media'>
              <div className='media-content'>
                <div className='content'>
                  {JSON.stringify(fig)}
                </div>
              </div>
    </article>
  })

  return <div className='selected-text-view'>
            <h2 className='title'>Text for {title} ({id})</h2>
            <div className='subtitle'><a href={url} target="_blank">View raw HTML</a></div>
            {sections}
            <section className='section footnotes-section'>
              <h3 className='title'>Footnotes</h3>
                {footnotes}
            </section>
            <section className='section figures-section'>
              <h3 className='title'>Figures</h3>
                {figures}
            </section>          
          </div>
}

function SelectedEntityView(props: any) {

  const [ready,setReady] = useState(false)
  const [data,setData] = useState({} as any)
  const [entityType,setEntityType] = useState(null)

  useEffect(() => {

    if ( props.dbId === null ) { return }
    props.sqlWorker.addEventListener( "message", (e: any) => msgResponder(e) )
    setReady(true)

  },[props.sqlWorker,props.dbId])

  useEffect(() => {
    if (!ready) { return }
    props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'selected-entity', rowMode: 'object', sql: `select id, type, package, data->>'$._url' as url, data->>'$.footnotes' as footnotes, data->>'$.sections' as sections, data->>'$.figures' as figures from documents where data->>'$._url'=?`, bind: [ props.selectedText ?? props.selectedToc ] }})     
  },[ready,props.selectedText,props.selectedToc])

  const msgResponder = (event: any) => {
    const msg = event.data
    switch (msg.type) {
      case 'selected-entity':
        if ( isResultTerminator(msg) ) { 
          return
        }
        const { id, type, package: packageId, sections: sect, footnotes: fnotes, url, figures: figs } = msg.row
        const sections = JSON.parse(sect)
        const footnotes = JSON.parse(fnotes)
        const figures = JSON.parse(figs)

        setEntityType(type)
        setData({id, package: packageId, sections, footnotes, figures, url })
        break
      default:
        return
      }
  }

  return <div className={`container selected-record ${props.className}`}>
            {
              entityType === 'toc' ? <SelectedTocView data={data} setSelected={props.setSelected} /> : ''
            }
            {
              entityType === 'text' ? <SelectedTextView data={data} /> : ''
            }
          </div>
}

function FiguresView(props: any) {

  const [ready,setReady] = useState(false)
  const [shouldBlit,setShouldBlit] = useState(false)

  const [rows,setRows] = useState([] as any)
  const [nextRows,setNextRows] = useState([] as any)

  const [currentPage,setCurrentPage] = useState(0)
  const [sortColumn,setSortColumn] = useState('id')
  const [sortOrder,setSortOrder] = useState('ASC')
  const [facet,setFacet] = useState(null as any)
  const [selectedFacet,setSelectedFacet] = useState(null as any)

  useEffect(() => {

    if ( props.dbId === null ) { return }
    props.sqlWorker.addEventListener( "message", (e: any) => msgResponder(e) )
    setReady(true)

  },[props.sqlWorker,props.dbId])

  useEffect(() => {

    if (!ready) { return }
    if (!facet) {
      props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'figures-facet', rowMode: 'object', sql: `select distinct package as pkg from documents where type='figure'`, bind: [  ] }})     
    }

    const offset = currentPage*25

    // TODO: Ease the query params here so we can select on empty package and still get all results
    if (selectedFacet) {
      props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'figures-rows', rowMode: 'object', sql: `select id, package, data->>'$._url' as url, title, error from documents where type='figure' and package=? order by ${sortColumn} ${sortOrder} limit 25 offset ?`, bind: [ selectedFacet, offset ] }})     
      return
    }

    props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'figures-rows', rowMode: 'object', sql: `select id, package, data->>'$._url' as url, title from documents where type='figure' order by ${sortColumn} ${sortOrder} limit 25 offset ?`, bind: [ offset ] }})     

  },[ready,currentPage,sortColumn,sortOrder,selectedFacet])

  useEffect(() => {

    if (!shouldBlit) { return }
    setRows(nextRows)
    setNextRows([])
    setShouldBlit(false)

  },[shouldBlit])

  const msgResponder = (event: any) => {
    const msg = event.data
    switch (msg.type) {
      case 'figures-facet':
        if ( isResultTerminator(msg) ) { return }
        setFacet( (nxt: any) => {
          if (!nxt) { return [ msg.row.pkg ]}
          return [ ...nxt, msg.row.pkg ]
        })
        break
      case 'figures-rows':
        if ( isResultTerminator(msg) ) { 
          setShouldBlit(true) 
          return
        }
        setNextRows( (nxt: any) => [ ...nxt, msg.row ])
        break
      default:
        return
      }
  }

  const handleSortClick = (col: string,event: any) => {
    event.preventDefault()

    setCurrentPage(0)
    if (col === sortColumn) {
      setSortOrder( sortOrder === 'ASC' ? 'DESC' : 'ASC' )
      return
    }

    setSortColumn(col)
    setSortOrder('ASC')
  }

  const handleFacetChange = (event: any) => {
    setCurrentPage(0)
    setSelectedFacet(event.target.value === 'all' || event.target.value === 'clear' ? null : event.target.value )
  }

  return <div className={`records records-figures ${props.className}`}>
          <Pagination current={currentPage} count={props.count} pageSize={25} setCurrent={setCurrentPage} />
          <div className='field'>

            <div className='control'>

              <div className='select'>
                <select value={ selectedFacet ?? 'all' } onChange={ (e) => handleFacetChange(e) }>
                  <option value='all'>Select publication</option>
                  { 
                    (facet ?? []).map( (p: any) => {
                      return <option value={p} >{p}</option>
                    }) 
                  }
                  {
                    ( selectedFacet ? <option value='clear'>Clear</option> : '' )
                  }
                </select>
              </div>
              
            </div>

          </div>
          <table className="table is-bordered is-striped is-hoverable">
            <thead>
              <tr>
                <th><a href="#" onClick={ (e) => handleSortClick('id',e) } ><SortedHeaderLabel showIcon={ sortColumn === 'id' } order={sortOrder} >id</SortedHeaderLabel></a></th>
                <th><a href="#" onClick={ (e) => handleSortClick('package',e) } ><SortedHeaderLabel showIcon={ sortColumn === 'package' } order={sortOrder} >package</SortedHeaderLabel></a></th>
                <th>raw_link</th>
                <th>title</th>
              </tr>
            </thead>
            <tfoot>
                <th>id</th>
                <th>package</th>
                <th>raw_link</th>
                <th>title</th>
            </tfoot>
            <tbody>
              { 
                rows.map( (r: any) => {
                  return <tr>
                          <td>{r.id}</td>
                          <td>{r.package}</td>
                          <td><a href={r.url} target="_blank">View as Raw HTML</a></td>
                          <td>{r.title}</td>
                        </tr>

                    })
              }
            </tbody>
          </table>        
          <Pagination current={currentPage} count={props.count} pageSize={25} setCurrent={setCurrentPage} />
        </div>
}

function TextsView(props: any) {

  // TODO: Wrap ASC/DESC and Column sort names in an (internal) enum

  const [ready,setReady] = useState(false)
  const [shouldBlit,setShouldBlit] = useState(false)

  const [rows,setRows] = useState([] as any)
  const [nextRows,setNextRows] = useState([] as any)

  const [currentPage,setCurrentPage] = useState(0)
  const [sortColumn,setSortColumn] = useState('id')
  const [sortOrder,setSortOrder] = useState('ASC')
  const [facet,setFacet] = useState(null as any)
  const [selectedFacet,setSelectedFacet] = useState(null as any)

  useEffect(() => {

    if ( props.dbId === null ) { return }
    props.sqlWorker.addEventListener( "message", (e: any) => msgResponder(e) )
    setReady(true)

  },[props.sqlWorker,props.dbId])

  useEffect(() => {

    if (!ready) { return }
    if (!facet) {
      props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'texts-facet', rowMode: 'object', sql: `select distinct package as pkg from documents where type='text' or type is null`, bind: [  ] }})     
    }

    const offset = currentPage*25

    // TODO: Ease the query params here so we can select on empty package and still get all results
    if (selectedFacet) {
      props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'texts-rows', rowMode: 'object', sql: `select id, package, data->>'$._url' as url, title, error from documents where ( type='text' or type is null ) and ( package=? ) order by ${sortColumn} ${sortOrder} limit 25 offset ?`, bind: [ selectedFacet, offset ] }})     
      return
    }

    props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'texts-rows', rowMode: 'object', sql: `select id as id, package as package, data->>'$._url' as url, title, error from documents where type='text' or type is null order by ${sortColumn} ${sortOrder} limit 25 offset ?`, bind: [ offset ] }})     

  },[ready,currentPage,sortColumn,sortOrder,selectedFacet])

  useEffect(() => {
    if (!shouldBlit) { return }
    setRows(nextRows)
    setNextRows([])
    setShouldBlit(false)
  },[shouldBlit])

  const msgResponder = (event: any) => {
    const msg = event.data
    switch (msg.type) {
      case 'texts-facet':
        if ( isResultTerminator(msg) ) { return }
        setFacet( (nxt: any) => {
          if (!nxt) { return [ msg.row.pkg ]}
          return [ ...nxt, msg.row.pkg ]
        })
        break
      case 'texts-rows':
        if ( isResultTerminator(msg) ) { 
          setShouldBlit(true) 
          return
        }
        setNextRows( (nxt: any) => [ ...nxt, msg.row ])
        break
      default:
        return
      }
  }

  const handleView = (url: string,event: any) => {
    event.preventDefault()
    props.setSelected(url)
  }

  const handleSortClick = (col: string,event: any) => {
    event.preventDefault()

    setCurrentPage(0)
    if (col === sortColumn) {
      setSortOrder( sortOrder === 'ASC' ? 'DESC' : 'ASC' )
      return
    }

    setSortColumn(col)
    setSortOrder('ASC')
  }

  const handleFacetChange = (event: any) => {
    setCurrentPage(0)
    setSelectedFacet(event.target.value === 'all' || event.target.value === 'clear' ? null : event.target.value )
  }

  return <div className={`records records-texts ${props.className}`}>
          <Pagination current={currentPage} count={props.count} pageSize={25} setCurrent={setCurrentPage} />
          <div className='field'>

            <div className='control'>

              <div className='select'>
                <select value={ selectedFacet === null ? 'all' : selectedFacet } onChange={ (e) => handleFacetChange(e) }>
                  <option value='all'>Select publication</option>
                  { 
                    (facet ?? []).map( (p: any) => {
                      return <option value={p} >{p}</option>
                    }) 
                  }
                  {
                    ( selectedFacet ? <option value='clear'>Clear</option> : '' )
                  }
                </select>
              </div>
              
            </div>

          </div>
          <table className="table is-bordered is-striped is-hoverable is-fullwidth is-narrow">
            <thead>
              <tr>
                <th scope='col'><a href="#" onClick={ (e) => handleSortClick('id',e) } ><SortedHeaderLabel showIcon={ sortColumn === 'id' } order={sortOrder} >id</SortedHeaderLabel></a></th>
                <th scope='col'><a href="#" onClick={ (e) => handleSortClick('package',e) } ><SortedHeaderLabel showIcon={ sortColumn === 'package' } order={sortOrder} >package</SortedHeaderLabel></a></th>
                <th scope='col'>raw_link</th>
                <th scope='col'><a href="#" onClick={ (e) => handleSortClick('title',e) } ><SortedHeaderLabel showIcon={ sortColumn === 'title' } order={sortOrder} >title</SortedHeaderLabel></a></th>
                <th scope='col'><a href="#" onClick={ (e) => handleSortClick('error',e) } ><SortedHeaderLabel showIcon={ sortColumn === 'error' } order={sortOrder} >error</SortedHeaderLabel></a></th>
                <th scope='col'>view</th>
              </tr>
            </thead>
            <tfoot>
                <th>id</th>
                <th>package</th>
                <th>raw_link</th>
                <th>title</th>
                <th>error</th>
            </tfoot>
            <tbody>
              { 
                rows.map( (r: any) => {
                  return <tr>
                          <td>{r.id}</td>
                          <td>{r.package}</td>
                          <td><a href={r.url} target="_blank">View as Raw HTML</a></td>
                          <td>{r.title}</td>
                          <td >{r.error}</td>
                          <td><a href="#" target="_blank" onClick={ (e) => handleView(r.url,e) } >View</a></td>
                        </tr>

                    })
              }
            </tbody>
          </table>        
          <Pagination current={currentPage} count={props.count} pageSize={25} setCurrent={setCurrentPage} />
        </div>
}

const isResultTerminator = (msg: any) => {
  return (msg.row === undefined && msg.rowNumber == null)
}

function PublicationsView(props: any) {

  const [rows,setRows] = useState([] as any)

  const [currentPage,setCurrentPage] = useState(0)

  useEffect(() => {

    if ( props.dbId === null ) { return }
    props.sqlWorker.addEventListener( "message", (e: any) => msgResponder(e) )

    props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'pubs-rows', rowMode: 'object', sql: `select id, data->>'$._href' as url, title as name, data->>'$._id_urn' as id_urn, json_array_length(data,'$._spine.itemref') as spine_length, data->>'$._toc_url' as toc_url, data->>'$._reader_url' as osci_url from documents where type='osci-package'` }})

  },[props.sqlWorker,props.dbId])

  const msgResponder = (event: any) => {
    const msg = event.data
    switch (msg.type) {
      case 'pubs-rows':
        if ( isResultTerminator(msg) ) { return }
        setRows( (rows: any) => [ ...rows, msg.row ] )
        break
      default:
        return
      }
  }

  const handleView = (url: string,event: any) => {
    event.preventDefault()
    props.setSelected(url)
  }

  return <div className={`records records-publications ${props.className}`}>
          <Pagination current={currentPage} count={props.count} pageSize={25} setCurrent={setCurrentPage} />
          <table className="table is-bordered is-striped is-hoverable">
            <thead>
              <tr>
                <th>id</th>
                <th>title</th>
                <th>id_urn</th>
                <th>spine_length</th>
                <th>view_osci</th>
                <th>raw_link</th>
                <th>view</th>
              </tr>
            </thead>
            <tfoot>
                <th>id</th>
                <th>title</th>
                <th>id_urn</th>
                <th>spine_length</th>
                <th>view_osci</th>
                <th>raw_link</th>
                <th>view</th>
            </tfoot>
            <tbody>
              { 
                rows.map( (r: any) => {
                  return <tr>
                          <td>{r.id}</td>
                          <td>{r.name}</td>
                          <td>{r.id_urn}</td>
                          <td>{r.spine_length}</td>
                          <td><a href={r.osci_url} target="_blank">View OSCI</a></td>
                          <td><a href={r.url} target="_blank">View XML</a></td>
                          <td><a href="#" target="_blank" onClick={ (e) => handleView(r.toc_url,e) } >View TOC</a></td>
                        </tr>

                    })
              }
            </tbody>
          </table>        
          <Pagination current={currentPage} count={props.count} pageSize={25} setCurrent={setCurrentPage} />
        </div>
        
}

function App() {

  const [workerReady,setWorkerReady] = useState(false)
  const [dbOpen, setDbOpen] = useState(false)
  const [dbId, setDbId] = useState(null)

  const [selectedTab,setSelectedTab] = useState('publications')
  const [selectedTocURL,setSelectedTocURL] = useState(null)
  const [selectedTextURL,setSelectedTextURL] = useState(null)
  const [selectedTocLabel,setSelectedTocLabel] = useState(null)
  const [selectedTextLabel,setSelectedTextLabel] = useState(null)
  const [pubCount, setPubCount] = useState(null)
  const [textCount, setTextCount] = useState(null)
  const [figureCount, setFigureCount] = useState(null)

  const sqlWorker = useMemo(
                      () => new Worker(new URL( './worker.js',import.meta.url)), 
                            []
                      )

  const tabLabels = (tab: string) => {

    switch (tab) {
    case 'publications':
      return 'Publications'
    case 'texts':
      return 'Texts'
    case 'figures':
      return 'Figures' 
    default:
      return ''     
    }

  }

  const msgResponder = (event: any) => {
    const msg = event.data

    switch (msg.type) {
      case 'log':
        break
      case 'error':
        break
      case 'sqlite3-api':
        if (msg.result === "worker1-ready") { setWorkerReady(true) }
        break
      case 'open':
        setDbOpen(true)
        setDbId(msg.dbId)
        break
      case 'pubs-count':
        if ( isResultTerminator(msg) ) { return }
        setPubCount(msg.row)
        break
      case 'texts-count':
        if ( isResultTerminator(msg) ) { return }
        setTextCount(msg.row)
        break
      case 'figures-count':
        if ( isResultTerminator(msg) ) { return }
        setFigureCount(msg.row)
        break
      case 'selected-toc-label':
        if ( isResultTerminator(msg) ) { return }
        setSelectedTocLabel(msg.row)
        break
      case 'selected-text-label':
        if ( isResultTerminator(msg) ) { return }
        setSelectedTextLabel(msg.row)
        break
      default:
        return
      }
  }

  sqlWorker.addEventListener( "message", (e: any) => msgResponder(e) )

  // INIT: Fetch the db, open the db with the bytes 
  useEffect(() => {
    if (!workerReady) { return }

    console.log('worker ready')

    fetch(dbFile)
      .then( res => res.arrayBuffer() )
      .then( (arrayBuffer) => {

        sqlWorker.postMessage({type: 'open', args: {filename: "/test.sqlite3", byteArray: arrayBuffer }})

      }) 

  },[workerReady])

  // Exec our first query now it's open 
  useEffect(() => {
    if (!dbOpen || dbId===null ) { return }

    console.log(`db open with id ${dbId}`)

    sqlWorker.postMessage({type: 'exec', dbId, args: {callback: 'pubs-count', rowMode: '$count', sql: `select count() as count from documents where type='osci-package'` }})
    sqlWorker.postMessage({type: 'exec', dbId, args: {callback: 'texts-count', rowMode: '$count', sql: `select count() as count from documents where type='text' or type is null` }})
    sqlWorker.postMessage({type: 'exec', dbId, args: {callback: 'figures-count', rowMode: '$count', sql: `select count() as count from documents where type='figure'` }})

  },[dbOpen,dbId])

  const handleRootClick = (event: any) => {
    event.preventDefault()
    setSelectedTocURL(null)
    setSelectedTextURL(null)
  }

  const handleBreadcrumbClick = (event: any) => {
    event.preventDefault()
    setSelectedTextURL(null)
    setSelectedTextLabel(null)
  }

  const handleTabClick = (tab: string) => {
    setSelectedTab(tab)
    setSelectedTocURL(null)
    setSelectedTextURL(null)
  }

  const selectTOC = (url: any) => {
    setSelectedTocURL(url)
    sqlWorker.postMessage({type: 'exec', dbId, args: {callback: 'selected-toc-label', rowMode: '$title', sql: `select title from documents where type='osci-package' and data->>'$._toc_url'=?`, bind: [ url ]  }})
  }

  const selectText = (url: any) => {
    setSelectedTextURL(url)
    sqlWorker.postMessage({type: 'exec', dbId, args: {callback: 'selected-text-label', rowMode: '$title', sql: `select title from documents where type='text' and data->>'$._url'=?`, bind: [ url ]  }})
  }

  const showBreadcrumbs = !selectedTocURL && !selectedTextURL
  return (
      <div className="container">

        <h1 className="title is-2 mb-3">OSCI Publications</h1>

        <div className={`tabs`}>
          <ul>
            <li className={ selectedTab == 'publications' ? 'is-active' : ''}><a onClick={ () => handleTabClick('publications') } >{`${ tabLabels('publications') } (${pubCount ?? ''})`}</a></li>
            <li className={ selectedTab == 'texts' ? 'is-active' : ''}><a onClick={ () => handleTabClick('texts') }>{`${ tabLabels('texts') } (${textCount ?? ''})`}</a></li>
            <li className={ selectedTab == 'figures' ? 'is-active' : ''}><a onClick={ () => handleTabClick('figures') }>{`${ tabLabels('figures') } (${figureCount ?? ''})`}</a></li>
          </ul>
        </div>
        <nav className={ `breadcrumb ${ showBreadcrumbs ? 'is-hidden' : '' }` } aria-label='breadcrumbs'>
          <ul>
            <li><a href="#" onClick={ (e) => handleRootClick(e) } >{ `${ tabLabels(selectedTab) }` }</a></li>
            <li className={ selectedTocURL && selectedTextURL ? '' : 'is-hidden' } ><a href="#" onClick={ (e) => handleBreadcrumbClick(e) } >{ `${ selectedTocLabel }` }</a></li>
            <li className='is-active'><a href="#" aria-current='page' onClick={ (e) => e.preventDefault() } >{ selectedTextLabel ?? selectedTocLabel }</a></li>
          </ul>
        </nav>
        <PublicationsView className={ !selectedTextURL && !selectedTocURL && selectedTab === 'publications' ? '' : 'is-hidden' } sqlWorker={sqlWorker} count={pubCount} dbId={dbId} setSelected={selectTOC} />
        <TextsView className={ !selectedTextURL && !selectedTocURL && selectedTab === 'texts' ? '' : 'is-hidden' } sqlWorker={sqlWorker} count={textCount} dbId={dbId} setSelected={selectText} /> {  }
        <FiguresView className={ !selectedTextURL && !selectedTocURL && selectedTab === 'figures' ? '' : 'is-hidden' } sqlWorker={sqlWorker} count={figureCount} dbId={dbId} /> 
        <SelectedEntityView className={ selectedTextURL !== null || selectedTocURL !== null ? '' : 'is-hidden' } sqlWorker={sqlWorker} selectedText={selectedTextURL} selectedToc={selectedTocURL} setSelected={selectText} />
      </div>
  )
}

export default App
