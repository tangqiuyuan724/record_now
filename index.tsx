
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Import global styles and Tailwind

// --- Global Error Handler Setup ---
const sendErrorToMain = (message: string) => {
  // @ts-ignore - electronAPI is injected by preload.js
  if (window.electronAPI && typeof window.electronAPI.logError === 'function') {
    // @ts-ignore
    window.electronAPI.logError(message);
  } else {
    // Fallback for dev environment or if preload isn't loaded
    console.error('[Logger Fallback]', message);
  }
};

// Capture runtime errors (e.g., undefined variables, syntax errors)
window.onerror = (message, source, lineno, colno, error) => {
  const errorDetails = `[Renderer Error] ${message} \n    at ${source}:${lineno}:${colno}\n    Stack: ${error?.stack || 'No stack trace'}`;
  sendErrorToMain(errorDetails);
};

// Capture async promise rejections (e.g., failed API calls)
window.onunhandledrejection = (event) => {
  const reason = event.reason instanceof Error ? event.reason.stack : event.reason;
  const errorDetails = `[Renderer Unhandled Rejection] ${reason}`;
  sendErrorToMain(errorDetails);
};

// --- App Rendering ---

const rootElement = document.getElementById('root');
if (!rootElement) {
  const msg = "Could not find root element to mount to";
  sendErrorToMain(`[Critical] ${msg}`);
  throw new Error(msg);
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
