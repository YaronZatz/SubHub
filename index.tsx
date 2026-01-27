
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Shim process.env for browser environments to prevent "Uncaught ReferenceError: process is not defined"
// while preserving any existing environment variables injected by the platform.
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
