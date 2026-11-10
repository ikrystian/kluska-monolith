import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@fontsource-variable/figtree/wght.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import './globals.css';
import App from './App';
import { AnimateReveal } from '@/components/animate-reveal';
// Installs the local reader for the downloaded exercise library before the first fetch.
import '@/lib/offline-exercises';

// Old path-style links (bookmarks, installed PWAs, push notifications) still
// arrive as /athlete/...; move them into the hash so the router sees them.
const { pathname, search, hash } = window.location;
if (pathname !== '/' && !pathname.endsWith('/index.html') && !hash) {
  window.history.replaceState(null, '', `/#${pathname}${search}`);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
      <AnimateReveal />
    </HashRouter>
  </StrictMode>
);
