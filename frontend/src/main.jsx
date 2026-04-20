import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import LandingPage from './components/LandingPage.jsx';
import { EditorProvider } from './context/EditorContext.jsx';
import './index.css';

// Route: / → LandingPage, /api/edit → Editor App
// All other routes also go to Editor for SPA routing
const path = window.location.pathname;
const isHome = path === '/';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isHome ? (
      <LandingPage />
    ) : (
      <EditorProvider>
        <App />
      </EditorProvider>
    )}
  </React.StrictMode>
);
