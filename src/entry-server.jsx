// Server entry used only at build time by scripts/prerender.mjs to turn each
// page into static HTML. The browser still boots normally from main.jsx.
import { renderToString } from 'react-dom/server'
import App from './App.jsx'

export function render(page) {
  return renderToString(<App page={page} />)
}
