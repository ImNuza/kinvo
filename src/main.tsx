import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Global CSS first, so screen CSS (imported by App's routes) wins ties with shared rules.
import './styles/tokens.css';
import './styles/base.css';
import './components/components.css';
import './app/app.css';
import { App } from './app/App.tsx';
import { StoreProvider } from './data/react.tsx';
import { createStore } from './data/store.ts';
import { applyUrlOverrides } from './lib/session.ts';

applyUrlOverrides();

const root = createRoot(document.getElementById('root')!);

void createStore().then((store) => {
  root.render(
    <StrictMode>
      <StoreProvider store={store}>
        <App />
      </StoreProvider>
    </StrictMode>,
  );
});
