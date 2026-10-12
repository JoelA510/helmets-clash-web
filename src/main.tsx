import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { clearSave } from './game/persist'
import { initObservability } from './observability'

// Before the first render, so a failure while mounting is reported too.
initObservability()

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
