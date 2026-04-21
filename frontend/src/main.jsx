import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import LandingPage from './components/LandingPage.jsx';
import { EditorProvider } from './context/EditorContext.jsx';
import './index.css';

// Route: /home or / → LandingPage   |   /edit → Editor
const p = window.location.pathname;
const isHome = p === '/' || p === '/home';

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
