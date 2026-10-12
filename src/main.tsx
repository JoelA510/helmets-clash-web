import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { clearSave } from './game/persist'
import { initObservability, isSentryTestRequest } from './observability'
import { env } from './env'

// Before the first render, so a failure while mounting is reported too.
const reporting = initObservability()
if (isSentryTestRequest(window.location.search, env.deployEnv)) {
  void reporting.then(() => setTimeout(() => {
    throw new Error('Sentry test error: ?sentry-test on a preview deployment')
  }))
}

// The outer boundary catches what App's own boundary can't: a throw in App
// itself or the setup screen. A reload is the only clean way back from
// there.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      onBackToSetup={() => window.location.reload()}
      onDiscardSave={() => { clearSave(); window.location.reload() }}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
