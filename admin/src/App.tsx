import { useEffect, useState, useMemo } from 'react'

import dbFile from './data/migration.sqlite3?url'

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
    props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'other-features-rows', rowMode: 'object', sql: `select id, data->>'$._url' as url, package, data->>'$._head_title' as title from documents where data->>'$._head_title'='Navigation' order by id limit 25 offset ?`, bind: [ offset ] }})     
  },[ready,currentPage])

  useEffect(() => {
    if (!shouldBlit) { return }
    console.log(nextRows)
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

  return (<div className="records records-other-features">
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
                          <td><a href={r.url} target="_blank">Link</a></td>
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
    props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'figures-rows', rowMode: 'object', sql: `select id, data->>'$._body.html' as body_html from documents where type='application/osci-tk-iip-figure' order by id limit 25 offset ?`, bind: [ offset ] }})     
  },[ready,currentPage])

  useEffect(() => {
    if (!shouldBlit) { return }
    console.log(nextRows)
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
              </tr>
            </thead>
            <tfoot>
                <th>id</th>
            </tfoot>
            <tbody>
              { 
                rows.map( (r: any) => {
                  return <tr>
                          <td>{r.id}</td>
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
    props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'texts-rows', rowMode: 'object', sql: `select id, package, data->>'$._url' as url, data->>'$._head_title' as head_title from documents where type='application/xhtml+xml' order by id limit 25 offset ?`, bind: [ offset ] }})     
  },[ready,currentPage])

  useEffect(() => {
    if (!shouldBlit) { return }
    console.log(nextRows)
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
          <table className="table is-bordered is-striped is-hoverable">
            <thead>
              <tr>
                <th>id</th>
                <th>package</th>
                <th>raw_link</th>
                <th>head_title</th>
              </tr>
            </thead>
            <tfoot>
                <th>id</th>
                <th>package</th>
                <th>raw_link</th>
                <th>head_title</th>
            </tfoot>
            <tbody>
              { 
                rows.map( (r: any) => {
                  return <tr>
                          <td>{r.id}</td>
                          <td>{r.package}</td>
                          <td><a href={r.url} target="_blank">Link</a></td>
                          <td>{r.head_title}</td>
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

    props.sqlWorker.postMessage({type: 'exec', dbId: props.dbId, args: {callback: 'pubs-rows', rowMode: 'object', sql: `select id, data->>'$._href' as url, data->>'$._title' as name, data->>'$._id_urn' as id_urn, json_array_length(data,'$._spine.itemref') as spine_length  from documents where type='application/oebps-package+xml'` }})

  },[props.sqlWorker,props.dbId])

  const msgResponder = (event: any) => {
    const msg = event.data
    switch (msg.type) {
      case 'pubs-rows':
        // console.log(event)
        if ( isResultTerminator(msg) ) { return }
        setRows( (rows: any) => [ ...rows, msg.row ] )
        break
      default:
        return
      }
  }

  return <div className="records records-publications">
          <Pagination current={currentPage} count={props.count} pageSize={25} setCurrent={setCurrentPage} />
          <table className="table is-bordered is-striped is-hoverable">
            <thead>
              <tr>
                <th>id</th>
                <th>title</th>
                <th>raw_link</th>
                <th>id_urn</th>
                <th>spine_length</th>
              </tr>
            </thead>
            <tfoot>
                <th>id</th>
                <th>title</th>
                <th>raw_link</th>
                <th>id_urn</th>
                <th>spine_length</th>
            </tfoot>
            <tbody>
              { 
                rows.map( (r: any) => {
                  return <tr>
                          <td>{r.id}</td>
                          <td>{r.name}</td>
                          <td><a href={r.url} target="_blank">Link</a></td>
                          <td>{r.id_urn}</td>
                          <td>{r.spine_length}</td>
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

    sqlWorker.postMessage({type: 'exec', dbId, args: {callback: 'pubs-count', rowMode: '$count', sql: `select count() as count from documents where type='application/oebps-package+xml'` }})
    sqlWorker.postMessage({type: 'exec', dbId, args: {callback: 'texts-count', rowMode: '$count', sql: `select count() as count from documents where type='application/xhtml+xml'` }})
    sqlWorker.postMessage({type: 'exec', dbId, args: {callback: 'figures-count', rowMode: '$count', sql: `select count() as count from documents where type='application/osci-tk-iip-figure'` }})
    sqlWorker.postMessage({type: 'exec', dbId, args: {callback: 'other-features-count', rowMode: '$count', sql: `select count() as count from documents where data->>'$._head_title'='Navigation'` }})

  },[dbOpen,dbId])

  return (
      <div className="container">

        <h1 className="title is-2 mb-3">Digital Publications Review</h1>

        <div className="tabs">
          <ul>
            <li className={ selectedTab == 'publications' ? 'is-active' : ''}><a onClick={ () => setSelectedTab('publications') } >{`Publications (${pubCount ?? ''})`}</a></li>
            <li className={ selectedTab == 'texts' ? 'is-active' : ''}><a onClick={ () => setSelectedTab('texts') }>{`Texts (${textCount ?? ''})`}</a></li>
            <li className={ selectedTab == 'figures' ? 'is-active' : ''}><a onClick={ () => setSelectedTab('figures') }>{`Figures (${figureCount ?? ''})`}</a></li>
            <li className={ selectedTab == 'other-features' ? 'is-active' : ''}><a onClick={ () => setSelectedTab('other-features') }>{`Tables of Contents (${tocCount ?? ''})`}</a></li>
          </ul>
        </div>
        { selectedTab === 'publications' ? <PublicationsView sqlWorker={sqlWorker} count={pubCount} dbId={dbId} /> : '' }
        { selectedTab === 'texts' ? <TextsView sqlWorker={sqlWorker} count={textCount} dbId={dbId} /> : '' }
        { selectedTab === 'figures' ? <FiguresView sqlWorker={sqlWorker} count={figureCount} dbId={dbId} /> : ''}
        { selectedTab === 'other-features' ? <OtherFeaturesView sqlWorker={sqlWorker} count={tocCount} dbId={dbId} /> : '' }
      </div>
  )
}

export default App
