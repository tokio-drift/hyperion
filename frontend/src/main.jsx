import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import LandingPage from './components/LandingPage.jsx';
import { EditorProvider } from './context/EditorContext.jsx';
import './index.css';

// Route: /api/home → LandingPage, everything else → Editor App
const path = window.location.pathname;
const isHome = path === '/' || path === '/api/home' || path === '/home';

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
