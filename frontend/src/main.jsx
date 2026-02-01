/**
 * =============================================================================
 * MAIN.JSX - REACT APPLICATION ENTRY POINT
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This is the entry point for the React application.
 * It renders the root App component into the DOM.
 * 
 * REACT 18 CHANGES:
 * React 18 uses createRoot instead of ReactDOM.render.
 * This enables concurrent features like Suspense and transitions.
 * 
 * STRICT MODE:
 * StrictMode is a development tool that:
 * - Warns about deprecated APIs
 * - Warns about side effects
 * - Double-renders components to find bugs
 * 
 * =============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

/**
 * createRoot()
 * 
 * Creates a React root for rendering.
 * We pass in the DOM element where React will render.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
