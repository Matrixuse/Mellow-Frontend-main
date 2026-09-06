import React from 'react';
import ReactDOM from 'react-dom/client';
// Humne yahan BrowserRouter ko import kiya hai
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';
import queryClient from './queryClient';

const root = ReactDOM.createRoot(document.getElementById('root'));

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
