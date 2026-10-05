import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initNativeBackButton } from './native/nativeBackButton';
import './styles/tokens.css';
import './styles/base.css';

initNativeBackButton();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
