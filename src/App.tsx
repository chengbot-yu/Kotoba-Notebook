/* ============================================================
   ことばノート — app shell: brand wordmark + navigation drawer
   + persistent snackbar host + routed views
   ============================================================ */
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box, Drawer, List, ListItemButton, ListItemText, Typography, Stack,
  IconButton, Toolbar, Tooltip, useMediaQuery, Divider, Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme, alpha } from '@mui/material/styles';
import { Store } from './lib/store';
import { useStoreVersion } from './hooks';
import { UIProvider, useUI } from './uiContext';
import HomeView from './views/HomeView';
import WordsView from './views/WordsView';
import ReviewView from './views/ReviewView';
import CalendarView from './views/CalendarView';
import AchievementsView from './views/AchievementsView';
import StatsView from './views/StatsView';
import SettingsView from './views/SettingsView';
import WordDialogHost from './components/WordDialogHost';
import SnackbarHost from './components/SnackbarHost';

export type ViewId = 'home' | 'words' | 'review' | 'calendar' | 'achievements' | 'stats' | 'settings';

export const NAV: { id: ViewId; label: string }[] = [
  { id: 'home', label: 'ホーム' },
  { id: 'words', label: '単語' },
  { id: 'review', label: '復習' },
  { id: 'calendar', label: 'カレンダー' },
  { id: 'achievements', label: '実績' },
  { id: 'stats', label: '統計' },
  { id: 'settings', label: '設定' },
];

const DRAWER_W = 224;

/** persistent state, hash-routed so refresh keeps the view */
function readHash(): ViewId {
  const h = location.hash.replace('#', '') as ViewId;
  return NAV.some(n => n.id === h) ? h : 'home';
}

export default function App() {
  return (
    <UIProvider>
      <Shell />
    </UIProvider>
  );
}

function Shell() {
  useStoreVersion();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { openWordDialog, notify } = useUI();
  const [view, setView] = useState<ViewId>(readHash);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setView(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((v: ViewId) => {
    location.hash = v;
    setView(v);
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const dueCount = Store.dashboard().dueCount;
  const navList = useMemo(() => {
    return (
      <List sx={{ px: 1.25, pt: 0.5, gap: 0.25, display: 'flex', flexDirection: 'column' }} disablePadding>
        {NAV.map(n => (
          <ListItemButton
            key={n.id}
            data-nav={n.id}
            selected={view === n.id}
            onClick={() => navigate(n.id)}
            sx={{ minHeight: 44 }}
          >
            <Box className="nav-ind" sx={{ position: 'absolute', left: 0, top: '22%', bottom: '22%', width: 3, borderRadius: 3, bgcolor: 'primary.main', opacity: 0 }} />
            <ListItemText
              primary={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>{n.label}</span>
                  {n.id === 'review' && dueCount > 0 && (
                    <Box component="span" sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'primary.main', bgcolor: t => alpha(t.palette.primary.main, 0.14), px: 0.9, py: 0.15, borderRadius: 6 }}>
                      {dueCount}
                    </Box>
                  )}
                </Stack>
              }
              primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: view === n.id ? 600 : 500 }}
            />
          </ListItemButton>
        ))}
      </List>
    );
  }, [view, navigate, dueCount]);

  const brand = (
    <Box sx={{ px: 2.5, pt: 3, pb: 2.5 }} data-brand>
      <Typography
        variant="h6"
        noWrap
        sx={{ fontSize: '1.32rem', fontWeight: 600, letterSpacing: '0.06em', color: 'text.primary', lineHeight: 1.3 }}
      >
        ことばノート
      </Typography>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', letterSpacing: '0.14em', mt: 0.4 }}>
        Japanese Vocabulary
      </Typography>
    </Box>
  );

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {isMobile && (
        <Toolbar sx={{ justifyContent: 'space-between', px: 1.5 }}>
          <Typography sx={{ fontWeight: 600, letterSpacing: '0.05em' }}>ことばノート</Typography>
          <IconButton size="small" onClick={() => setDrawerOpen(false)} aria-label="閉じる"><CloseIcon fontSize="small" /></IconButton>
        </Toolbar>
      )}
      {!isMobile && brand}
      <Divider sx={{ mx: 2 }} />
      <Box sx={{ pt: 1.5 }}>{navList}</Box>
      <Box sx={{ mt: 'auto', p: 2.5 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon sx={{ fontSize: 17 }} />}
          onClick={() => openWordDialog()}
          data-testid="drawer-add"
          sx={{ py: 1, fontSize: '0.86rem' }}
        >
          単語を追加
        </Button>
      </Box>
    </Box>
  );

  const desktopDrawer = (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_W, flexShrink: 0,
        '& .MuiDrawer-paper': { width: DRAWER_W, boxSizing: 'border-box' },
      }}
      open
    >
      {drawerContent}
    </Drawer>
  );

  const mobileDrawer = (
    <Drawer
      variant="temporary"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: 268 } }}
    >
      {drawerContent}
    </Drawer>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }} data-app>
      {!isMobile && desktopDrawer}
      {isMobile && mobileDrawer}
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {isMobile && (
          <Toolbar
            sx={{
              position: 'sticky', top: 0, zIndex: 20,
              borderBottom: '1px solid', borderColor: 'divider',
              px: { xs: 1.5, sm: 2.5 },
            }}
          >
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} aria-label="メニュー"><MenuIcon /></IconButton>
            <Typography sx={{ ml: 1.5, fontWeight: 600, fontSize: '1.05rem', letterSpacing: '0.05em' }}>ことばノート</Typography>
          </Toolbar>
        )}
        <Box
          component="section"
          data-view={view}
          sx={{
            flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
            maxWidth: 1080, mx: 'auto',
            px: { xs: 2.5, sm: 4, md: 5 }, py: { xs: 3, md: 5 },
            width: '100%',
          }}
        >
          {view === 'home' && <HomeView onNavigate={navigate} />}
          {view === 'words' && <WordsView />}
          {view === 'review' && <ReviewView onNavigate={navigate} />}
          {view === 'calendar' && <CalendarView />}
          {view === 'achievements' && <AchievementsView />}
          {view === 'stats' && <StatsView />}
          {view === 'settings' && <SettingsView />}
        </Box>
      </Box>
      <WordDialogHost />
      <SnackbarHost />
    </Box>
  );
}
