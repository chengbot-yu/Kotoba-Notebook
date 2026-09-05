import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Store } from './lib/store';
import { themes } from './theme';
import App from './App';
import { useStoreVersion } from './hooks';
import { useEffect, useState } from 'react';

function Boot() {
  useStoreVersion();
  const [ready, setReady] = useState(false);
  useEffect(() => { Store.init().then(() => setReady(true)); }, []);
  if (!ready) return null;
  const theme = Store.settings.theme === 'light' ? themes.light : themes.dark;
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
);
