/* ============================================================
   ことばノート — UI context: word dialog controller + snackbar
   ============================================================ */
import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { Store } from './lib/store';
import type { Word } from './lib/types';

type Snack = { msg: string; severity: 'success' | 'info' | 'warning' | 'error' } | null;

interface UICtx {
  dialogWord: Word | null;
  dialogOpen: boolean;
  openWordDialog: (word?: Word | null) => void;
  closeWordDialog: () => void;
  notify: (msg: string, severity?: Snack extends null ? never : 'success' | 'info' | 'warning' | 'error') => void;
  snack: Snack;
  closeSnack: () => void;
}

const Ctx = createContext<UICtx | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [dialogWord, setDialogWord] = useState<Word | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  const openWordDialog = useCallback((word?: Word | null) => { setDialogWord(word ?? null); setDialogOpen(true); }, []);
  const closeWordDialog = useCallback(() => setDialogOpen(false), []);
  const notify = useCallback((msg: string, severity: 'success' | 'info' | 'warning' | 'error' = 'success') => setSnack({ msg, severity }), []);
  const closeSnack = useCallback(() => setSnack(null), []);

  return (
    <Ctx.Provider value={{ dialogWord, dialogOpen, openWordDialog, closeWordDialog, notify, snack, closeSnack }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUI(): UICtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUI outside provider');
  return v;
}

export { Store };
