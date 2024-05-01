import { useEffect, useState, useMemo } from 'react'
import './App.css'

import dbFile from './data/migration.sqlite3?url'

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
                  <a href='#' onClick={ (e) => handleSelection(url,e) }>
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
                    <br/>
                    <dl className={ subheads.length > 0 ? '' : 'is-hidden' } >
                      { 
                        subheads.map( (sh: any) => {
                          return <><span className='is-text-weight-semibold'>{sh.id}:</span>&nbsp;<span>{sh.label}</span><br/></>
                        }) 
                      }
                    </dl>
                    <small><a href='#' onClick={ (e) => handleSelection(url,e) }>View</a>&nbsp;|&nbsp;<a href={data.url} target="_blank">View raw</a></small>
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

  const { id, url, title, footnotes: fnotes } = props.data

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

  return <div className='selected-text-view'>
            <h2 className='title'>Text for {title} ({id})</h2>
            <div className='subtitle'><a href={url} target="_blank">View raw HTML</a></div>
            <section className='section footnotes-section'>
              <h3 className='title'>Footnotes</h3>
                {footnotes}
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
    props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'selected-entity', rowMode: 'object', sql: `select id, type, package, data->>'$._url' as url, data->>'$.footnotes' as footnotes, data->>'$.sections' as sections from documents where data->>'$._url'=?`, bind: [ props.selected ] }})     
  },[ready,props.selected])

  const msgResponder = (event: any) => {
    const msg = event.data
    switch (msg.type) {
      case 'selected-entity':
        if ( isResultTerminator(msg) ) { 
          return
        }
        const { id, type, package: packageId, sections: sect, footnotes: fnotes, url } = msg.row
        const sections = JSON.parse(sect)
        const footnotes = JSON.parse(fnotes)

        setEntityType(type)
        setData({id, package: packageId, sections, footnotes, url })
        break
      default:
        return
      }
  }

  return <div className="container selected-record">
            {
              entityType === 'toc' ? <SelectedTocView data={data} setSelected={props.setSelected} /> : ''
            }
            {
              entityType === 'text' ? <SelectedTextView data={data} setSelected={props.setSelected} /> : ''
            }
          </div>
}

function OtherFeaturesView(props: any) {

  const [ready,setReady] = useState(false)
  const [shouldBlit,setShouldBlit] = useState(false)

  const [rows,setRows] = useState([] as any)
  const [nextRows,setNextRows] = useState([] as any)

  const [currentPage,setCurrentPage] = useState(0)

  useEffect(() => {

    if ( props.dbId === null ) { return }
    props.sqlWorker.addEventListener( "message", (e: any) => msgResponder(e) )
    setReady(true)

  },[props.sqlWorker,props.dbId])

  useEffect(() => {
    const offset = currentPage*25
    props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'other-features-rows', rowMode: 'object', sql: `select id, data->>'$._url' as url, package, title from documents where type='toc' order by id limit 25 offset ?`, bind: [ offset ] }})     
  },[ready,currentPage])

  useEffect(() => {
    if (!shouldBlit) { return }
    setRows(nextRows)
    setNextRows([])
    setShouldBlit(false)
  },[shouldBlit])

  const msgResponder = (event: any) => {
    const msg = event.data
    switch (msg.type) {
      case 'other-features-rows':
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

  return (<div className="records records-other-features w-100">
          <Pagination current={currentPage} count={props.count} pageSize={25} setCurrent={setCurrentPage} />
          <table className="table is-bordered is-striped is-hoverable">
            <thead>
              <tr>
                <th>id</th>
                <th>raw_link</th>
                <th>publication</th>
                <th>title</th>
              </tr>
            </thead>
            <tfoot>
                <th>id</th>
                <th>raw_link</th>
                <th>publication</th>
                <th>title</th>
            </tfoot>
            <tbody>
              { 
                rows.map( (r: any) => {
                  return <tr>
                          <td>{r.id}</td>
                          <td><a href={r.url} target="_blank">View as Raw HTML</a></td>
                          <td>{r.package}</td>
                          <td>{r.title}</td>
                        </tr>

                    })
              }
            </tbody>
          </table>        
          <Pagination current={currentPage} count={props.count} pageSize={25} setCurrent={setCurrentPage} />
        </div>
  )     
}

function FiguresView(props: any) {

  const [ready,setReady] = useState(false)
  const [shouldBlit,setShouldBlit] = useState(false)

  const [rows,setRows] = useState([] as any)
  const [nextRows,setNextRows] = useState([] as any)

  const [currentPage,setCurrentPage] = useState(0)

  useEffect(() => {

    if ( props.dbId === null ) { return }
    props.sqlWorker.addEventListener( "message", (e: any) => msgResponder(e) )
    setReady(true)

  },[props.sqlWorker,props.dbId])

  useEffect(() => {
    const offset = currentPage*25
    props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'figures-rows', rowMode: 'object', sql: `select id, package, data->>'$._url' as url, title from documents where type='figure' order by id limit 25 offset ?`, bind: [ offset ] }})     
  },[ready,currentPage])

  useEffect(() => {
    if (!shouldBlit) { return }
    setRows(nextRows)
    setNextRows([])
    setShouldBlit(false)
  },[shouldBlit])

  const msgResponder = (event: any) => {
    const msg = event.data
    switch (msg.type) {
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

  return <div className="records records-figures">
          <Pagination current={currentPage} count={props.count} pageSize={25} setCurrent={setCurrentPage} />
          <table className="table is-bordered is-striped is-hoverable">
            <thead>
              <tr>
                <th>id</th>
                <th>package</th>
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

function TextsView(props: any) {

  const [ready,setReady] = useState(false)
  const [shouldBlit,setShouldBlit] = useState(false)

  const [rows,setRows] = useState([] as any)
  const [nextRows,setNextRows] = useState([] as any)

  const [currentPage,setCurrentPage] = useState(0)

  useEffect(() => {

    if ( props.dbId === null ) { return }
    props.sqlWorker.addEventListener( "message", (e: any) => msgResponder(e) )
    setReady(true)

  },[props.sqlWorker,props.dbId])

  useEffect(() => {
    const offset = currentPage*25
    props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'texts-rows', rowMode: 'object', sql: `select id, package, data->>'$._url' as url, title, error from documents where type='text' or type is null order by id limit 25 offset ?`, bind: [ offset ] }})     
  },[ready,currentPage])

  useEffect(() => {
    if (!shouldBlit) { return }
    setRows(nextRows)
    setNextRows([])
    setShouldBlit(false)
  },[shouldBlit])

  const msgResponder = (event: any) => {
    const msg = event.data
    switch (msg.type) {
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

  return <div className="records records-texts">
          <Pagination current={currentPage} count={props.count} pageSize={25} setCurrent={setCurrentPage} />
          <table className="table is-bordered is-striped is-hoverable is-fullwidth is-narrow">
            <thead>
              <tr>
                <th scope='col'>id</th>
                <th scope='col'>package</th>
                <th scope='col'>raw_link</th>
                <th scope='col'>title</th>
                <th scope='col'>error</th>
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

    props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'pubs-rows', rowMode: 'object', sql: `select id, data->>'$._href' as url, data->>'$._title' as name, data->>'$._id_urn' as id_urn, json_array_length(data,'$._spine.itemref') as spine_length, data->>'$._toc_url' as toc_url, data->>'$._reader_url' as osci_url from documents where type='osci-package'` }})

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

  return <div className="records records-publications">
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
                          <td><a href={r.url} target="_blank">View as Raw HTML</a></td>
                          <td><a href="#" target="_blank" onClick={ (e) => handleView(r.toc_url,e) } >View</a></td>
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
  const [pubCount, setPubCount] = useState(null)
  const [textCount, setTextCount] = useState(null)
  const [figureCount, setFigureCount] = useState(null)
  const [tocCount, setTocCount] = useState(null)

  const sqlWorker = useMemo(
                      () => new Worker(new URL( './worker.js',import.meta.url)), 
                            []
                      )

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
      case 'other-features-count':
        if ( isResultTerminator(msg) ) { return }
        setTocCount(msg.row)
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
    sqlWorker.postMessage({type: 'exec', dbId, args: {callback: 'other-features-count', rowMode: '$count', sql: `select count() as count from documents where type='toc'` }})

  },[dbOpen,dbId])

  const handleBreadcrumbClick = (event: any) => {
    event.preventDefault()
    setSelectedTocURL(null)
  }

  return (
      <div className="container">

        <h1 className="title is-2 mb-3">OSCI Publications</h1>

        <div className="tabs">
          <ul>
            <li className={ selectedTab == 'publications' ? 'is-active' : ''}><a onClick={ () => setSelectedTab('publications') } >{`Publications (${pubCount ?? ''})`}</a></li>
            {/*<li className={ selectedTab == 'other-features' ? 'is-active' : ''}><a onClick={ () => setSelectedTab('other-features') }>{`Tables of Contents (${tocCount ?? ''})`}</a></li>*/}
            <li className={ selectedTab == 'texts' ? 'is-active' : ''}><a onClick={ () => setSelectedTab('texts') }>{`Texts (${textCount ?? ''})`}</a></li>
            <li className={ selectedTab == 'figures' ? 'is-active' : ''}><a onClick={ () => setSelectedTab('figures') }>{`Figures (${figureCount ?? ''})`}</a></li>
          </ul>
        </div>
        <nav className={ `breadcrumb ${ selectedTocURL === null ? 'is-hidden' : '' }` } aria-label='breadcrumbs'>
          <ul>
            <li><a href="#" onClick={ (e) => handleBreadcrumbClick(e) } >Publications</a></li>
            <li className='is-active'><a href="#" aria-current='page' onClick={ (e) => e.preventDefault() } >{selectedTocURL}</a></li>
          </ul>
        </nav>
        {/* TODO: These should twiddle display on selection so we pay 1 DOM manip cost */}
        { !selectedTocURL && selectedTab === 'publications' ? <PublicationsView sqlWorker={sqlWorker} count={pubCount} dbId={dbId} setSelected={setSelectedTocURL} /> : '' }
        { !selectedTocURL && selectedTab === 'other-features' ? <OtherFeaturesView sqlWorker={sqlWorker} count={tocCount} dbId={dbId} /> : '' }
        { !selectedTocURL && selectedTab === 'texts' ? <TextsView sqlWorker={sqlWorker} count={textCount} dbId={dbId} /> : '' }
        { !selectedTocURL && selectedTab === 'figures' ? <FiguresView sqlWorker={sqlWorker} count={figureCount} dbId={dbId} /> : ''}
        { selectedTocURL !== null ? <SelectedEntityView sqlWorker={sqlWorker} selected={selectedTocURL} setSelected={setSelectedTocURL} /> : '' }
      </div>
  )
}

export default App
