import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Toast UI Editor 에러 처리
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes('ReactDOM.render is no longer supported')) {
    return;
  }
  originalError.call(console, ...args);
};

const root = createRoot(document.getElementById('root'));
root.render(
  <App />
);
