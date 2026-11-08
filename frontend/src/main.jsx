import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { SiteSettingsProvider } from './context/SiteSettingsContext'
import { AppConfigProvider } from './context/AppConfigContext.jsx'
import LanguageProvider from './context/LanguageProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AppConfigProvider><SiteSettingsProvider><App /></SiteSettingsProvider></AppConfigProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
)
