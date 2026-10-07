// Per-page search and share metadata. Used by the app at runtime (title,
// description, canonical and share tags change as visitors move between pages)
// and by scripts/prerender.mjs, which bakes the same tags into a static HTML
// file per page so crawlers and link previews see them without running JS.

export const SITE_URL = 'https://datatrop.in'

export const PAGE_META = {
  home: {
    path: '/',
    title: 'Datatrop | AI Systems & Business Automation Engineering',
    description:
      'Datatrop designs, builds and operates intelligent business systems: enterprise AI platforms, AI agents and workforce automation, revenue and communication intelligence. Engineered around your problem, from Kerala, India.',
    image: '/og/home.jpg',
  },
  about: {
    path: '/about',
    title: 'About Datatrop | Intelligent Systems Engineering Company',
    description:
      'Datatrop is an intelligent systems engineering company. Learn who we are, how we engage, the complexity scale we work across, and why we start with the problem, not the technology.',
    image: '/og/about.jpg',
    crumb: 'About',
  },
  'what-we-do': {
    path: '/what-we-do',
    title: 'What We Do | Enterprise AI, AI Agents & Automation | Datatrop',
    description:
      'Enterprise AI systems, AI workforce platforms, revenue intelligence, communication intelligence and AI product development. Custom systems that remove manual work, connect your tools and speed up decisions.',
    image: '/og/what-we-do.jpg',
    crumb: 'What We Do',
  },
  industries: {
    path: '/industries',
    title: 'Industries | AI & Automation for Manufacturing, Distribution, Healthcare & Finance | Datatrop',
    description:
      'Operational AI and automation systems for manufacturing, distribution and trading, healthcare and financial services, plus logistics, retail, government, energy and more.',
    image: '/og/industries.jpg',
    crumb: 'Industries',
  },
  news: {
    path: '/news',
    title: 'News & Events | Datatrop',
    description:
      'Events, talks, launches and milestones from Datatrop, the intelligent systems engineering company from Kerala, India.',
    image: '/og/home.jpg',
    crumb: 'News & Events',
  },
  contact: {
    path: '/contact',
    title: 'Contact Datatrop | Book a 30-Minute Strategy Call',
    description:
      'Book a 30-minute strategy call with a Datatrop engineer straight into our calendar, or send us a message and we will reply within 24 hours.',
    image: '/og/contact.jpg',
    crumb: 'Contact',
  },
}

export const pageKeyFromPath = (path) => {
  const clean = (path || '/').replace(/\/+$/, '') || '/'
  return Object.keys(PAGE_META).find((k) => PAGE_META[k].path === clean) || null
}

// JSON-LD for a page: WebPage + breadcrumb (the Organization block lives in index.html)
export function pageJsonLd(key) {
  const m = PAGE_META[key]
  const url = SITE_URL + (m.path === '/' ? '/' : m.path)
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: m.title,
      description: m.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en',
    },
  ]
  if (m.crumb) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: m.crumb, item: url },
      ],
    })
  }
  if (key === 'what-we-do') {
    const services = [
      ['Enterprise AI Systems', 'Unified operating platforms that connect every department into one intelligent system.'],
      ['AI Workforce Platforms', 'Multi-agent systems that execute operational work such as intake, reconciliation, follow-ups and reporting.'],
      ['Revenue Intelligence Systems', 'Lead intelligence, sales automation and conversion optimization.'],
      ['Communication Intelligence Platforms', 'Omnichannel communication with call and conversation intelligence.'],
      ['AI Product Development', 'AI-native products and industry platforms, engineered end to end.'],
    ]
    for (const [name, description] of services) {
      graph.push({ '@type': 'Service', name, description, provider: { '@id': `${SITE_URL}/#organization` }, areaServed: 'Worldwide' })
    }
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

// Keep the live document's head in sync when the app switches pages
export function applyPageMeta(key) {
  if (typeof document === 'undefined' || !PAGE_META[key]) return
  const m = PAGE_META[key]
  const url = SITE_URL + (m.path === '/' ? '/' : m.path)
  const image = SITE_URL + m.image
  document.title = m.title
  const set = (selector, attr, value) => {
    const el = document.head.querySelector(selector)
    if (el) el.setAttribute(attr, value)
  }
  set('meta[name="description"]', 'content', m.description)
  set('link[rel="canonical"]', 'href', url)
  set('meta[property="og:title"]', 'content', m.title)
  set('meta[property="og:description"]', 'content', m.description)
  set('meta[property="og:url"]', 'content', url)
  set('meta[property="og:image"]', 'content', image)
  set('meta[property="og:image:alt"]', 'content', m.title)
  set('meta[name="twitter:title"]', 'content', m.title)
  set('meta[name="twitter:description"]', 'content', m.description)
  set('meta[name="twitter:image"]', 'content', image)
  let ld = document.getElementById('page-jsonld')
  if (!ld) {
    ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.id = 'page-jsonld'
    document.head.appendChild(ld)
  }
  ld.textContent = JSON.stringify(pageJsonLd(key))
}
