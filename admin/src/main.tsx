import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// FIXME: Parse URL hash params for permalinks and pass to `App`

function urlState(separator=`|`) {
  // Splits the current URL hash by `|`
  if ( window.location.hash === '' || window.location.hash == undefined ) { 
    return []
  }

  const decoded = decodeURI(window.location.hash)
  return decoded.split(separator)
                .map( (h: string) => {

                  const matches = [...h.matchAll(/^#?(tab|view):(.+)/g)]
                  if (matches.length === 0) {
                    return {}
                  }

                  const [ , type, id ] = matches[0]

                  return {
                    type,id
                  }

                })

}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App urlNavState={urlState()} />
  </React.StrictMode>,
)
