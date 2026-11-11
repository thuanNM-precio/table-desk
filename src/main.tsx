import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { usingMockApi } from './api/client'
import { App } from './app'
import './styles.css'

async function startMockApi() {
  if (!usingMockApi) return
  const { worker } = await import('./mocks/browser')
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledFrame: 'bypass',
    quiet: true,
  })
}

startMockApi().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
