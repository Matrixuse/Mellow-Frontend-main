import React from 'react';
import ReactDOM from 'react-dom/client';
// Humne yahan BrowserRouter ko import kiya hai
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Humne poore App ko BrowserRouter ke andar daal diya hai */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
