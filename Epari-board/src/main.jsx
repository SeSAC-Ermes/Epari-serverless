import React from 'react';
import { render } from 'react-dom';
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

render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById('root')
);
