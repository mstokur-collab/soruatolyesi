import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import { ToastProvider } from './components/Toast';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// FIX: To resolve an obscure type-checking error where a required 'children' prop is incorrectly reported as missing on a provider, the component tree is wrapped in a functional component before rendering.
const AppTree = () => (
  <React.StrictMode>
    <HashRouter>
      <ToastProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ToastProvider>
    </HashRouter>
  </React.StrictMode>
);

root.render(<AppTree />);