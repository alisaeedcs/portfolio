import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { startAnalytics } from './analytics'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

startAnalytics()

// If a file the page needs has been replaced by a newer deploy (a tab left open for a while), reload once to get the new version.
window.addEventListener('vite:preloadError', () => {
  try {
    if (sessionStorage.getItem('reloaded-for-update')) return
    sessionStorage.setItem('reloaded-for-update', '1')
  } catch {
    /* ignore */
  }
  window.location.reload()
})
