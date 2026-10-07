// Bakes a finished HTML file per page into dist/ after `vite build`, so search
// engines and link previews (LinkedIn, WhatsApp, Slack) get real content and
// the right title/description/canonical/share tags without running JavaScript.
//   dist/index.html       → /
//   dist/about.html       → /about        (served via .htaccess rewrite)
//   dist/what-we-do.html  → /what-we-do   …and so on
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { PAGE_META, SITE_URL, pageJsonLd } from '../src/seo.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')
const { render } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href)
const template = readFileSync(path.join(dist, 'index.html'), 'utf8')

const esc = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function setTag(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`prerender: could not find ${label} in index.html`)
  return html.replace(pattern, replacement)
}

for (const [key, m] of Object.entries(PAGE_META)) {
  const url = SITE_URL + (m.path === '/' ? '/' : m.path)
  const image = SITE_URL + m.image
  let html = template
  html = html.replace('<html lang="en">', '<html lang="en" class="dark">')
  html = setTag(html, /<title>[^<]*<\/title>/, `<title>${esc(m.title)}</title>`, 'title')
  html = setTag(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(m.description)}" />`, 'description')
  html = setTag(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`, 'canonical')
  html = setTag(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(m.title)}" />`, 'og:title')
  html = setTag(html, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(m.description)}" />`, 'og:description')
  html = setTag(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`, 'og:url')
  html = setTag(html, /<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${image}" />`, 'og:image')
  html = setTag(html, /<meta property="og:image:alt" content="[^"]*" \/>/, `<meta property="og:image:alt" content="${esc(m.title)}" />`, 'og:image:alt')
  html = setTag(html, /<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${esc(m.title)}" />`, 'twitter:title')
  html = setTag(html, /<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${esc(m.description)}" />`, 'twitter:description')
  html = setTag(html, /<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${image}" />`, 'twitter:image')
  const ld = JSON.stringify(pageJsonLd(key)).replace(/</g, '\\u003c')
  html = html.replace('</head>', `    <script type="application/ld+json" id="page-jsonld">${ld}</script>\n  </head>`)
  html = setTag(html, /<div id="root"><\/div>/, `<div id="root">${render(key)}</div>`, 'root div')

  const file = m.path === '/' ? 'index.html' : `${m.path.slice(1)}.html`
  writeFileSync(path.join(dist, file), html)
  console.log(`prerendered ${m.path.padEnd(12)} → dist/${file}`)
}

rmSync(ssrDir, { recursive: true, force: true })
