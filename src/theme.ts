/* ============================================================
   ことばノート — MUI theme: "sumi" (墨)
   墨色深灰蓝底 × 暖白文字 × 低饱和鼠尾草强调色。
   所有视觉决策都集中在这里，组件内不再散落硬编码颜色。
   ============================================================ */
import { createTheme, alpha } from '@mui/material/styles';

const jpFont = [
  '-apple-system', 'BlinkMacSystemFont', '"Hiragino Sans"', '"Hiragino Kaku Gothic ProN"',
  '"Yu Gothic Medium"', '"Yu Gothic"', '"Noto Sans JP"', '"Meiryo"', '"Segoe UI"', 'Roboto',
  '"Microsoft YaHei"', 'sans-serif',
].join(', ');

export const palette = {
  bg: '#111318',
  paper: '#171A21',
  paperElev: '#1D212A',
  text: '#F2F2EF',
  text2: '#A5A7AF',
  text3: '#777B85',
  border: 'rgba(255,255,255,0.08)',
  accent: '#9CB5A2',
  accentSoft: 'rgba(156,181,162,0.14)',
  warn: '#C8A37A',
  danger: '#C67B6F',
  good: '#8FAE9B',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: palette.bg, paper: palette.paper },
    text: { primary: palette.text, secondary: palette.text2, disabled: palette.text3 },
    primary: { main: palette.accent, contrastText: '#14171C' },
    secondary: { main: palette.warn },
    error: { main: palette.danger },
    warning: { main: palette.warn },
    success: { main: palette.good },
    divider: palette.border,
  },
  shape: { borderRadius: 10 },
  spacing: 8,
  typography: {
    fontFamily: jpFont,
    htmlFontSize: 16,
    h1: { fontSize: '1.35rem', fontWeight: 600, letterSpacing: '0.01em', lineHeight: 1.4 },
    h2: { fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.45 },
    h3: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
    body1: { fontSize: '0.95rem', lineHeight: 1.75 },
    body2: { fontSize: '0.875rem', lineHeight: 1.7 },
    caption: { fontSize: '0.78rem', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
  },
  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.25)',
    '0 2px 8px rgba(0,0,0,0.28)',
    '0 4px 16px rgba(0,0,0,0.30)',
    '0 8px 28px rgba(0,0,0,0.34)',
    ...Array(20).fill('0 8px 28px rgba(0,0,0,0.34)'),
  ] as unknown as typeof createTheme extends (...args: never) => never ? never : any,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.bg,
          color: palette.text,
          backgroundImage: 'radial-gradient(1200px 500px at 30% -10%, rgba(156,181,162,0.05), transparent 60%), radial-gradient(900px 420px at 90% 110%, rgba(156,181,162,0.035), transparent 60%)',
          backgroundAttachment: 'fixed',
          overflowX: 'hidden',
        },
        '::selection': { background: alpha(palette.accent, 0.28) },
        '*': { scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.16) transparent' },
        '::-webkit-scrollbar': { width: 9, height: 9 },
        '::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.16)', borderRadius: 99, border: '2px solid transparent', backgroundClip: 'padding-box' },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        'a': { color: 'inherit' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 9, fontWeight: 600, transition: 'background-color .18s, border-color .18s, color .18s' },
        sizeLarge: { padding: '10px 22px', fontSize: '0.95rem' },
        sizeMedium: { padding: '7px 18px' },
        sizeSmall: { padding: '4px 12px', fontSize: '0.82rem' },
        containedPrimary: {
          backgroundColor: palette.accent,
          color: '#14171C',
          '&:hover': { backgroundColor: '#AABFA5' },
        },
        outlined: {
          borderColor: 'rgba(255,255,255,0.16)',
          color: palette.text,
          '&:hover': { borderColor: 'rgba(255,255,255,0.30)', backgroundColor: 'rgba(255,255,255,0.04)' },
        },
        text: { color: palette.text2, '&:hover': { color: palette.text, backgroundColor: 'rgba(255,255,255,0.05)' } },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: palette.border },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.paperElev,
          border: `1px solid ${palette.border}`,
          borderRadius: 14,
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.paper,
          borderRight: `1px solid ${palette.border}`,
          backgroundImage: 'none',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: alpha(
            theme.palette.mode === 'dark' ? '#111318' : theme.palette.background.default,
            theme.palette.mode === 'dark' ? 0.78 : 0.8,
          ),
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.035)',
          '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
          '&.Mui-focused fieldset': { borderColor: alpha(palette.accent, 0.65) },
        },
        input: { fontSize: '0.95rem' },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { color: palette.text3, '&.Mui-focused': { color: palette.accent } } } },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 7, fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.06)', color: palette.text2 },
        sizeSmall: { height: 22, fontSize: '0.75rem' },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          color: palette.text2,
          '&.Mui-selected': {
            color: palette.text,
            backgroundColor: palette.accentSoft,
            '&:hover': { backgroundColor: alpha(palette.accent, 0.19) },
            '& .nav-ind': { opacity: 1 },
          },
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.045)', color: palette.text },
        },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: false },
      styleOverrides: { tooltip: { backgroundColor: palette.paperElev, border: `1px solid ${palette.border}`, fontSize: '0.78rem' } },
    },
    MuiSnackbar: { defaultProps: { autoHideDuration: 2600 } },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, border: `1px solid ${palette.border}` },
        standardSuccess: { backgroundColor: alpha(palette.good, 0.12), color: palette.good },
        standardWarning: { backgroundColor: alpha(palette.warn, 0.12), color: palette.warn },
        standardError: { backgroundColor: alpha(palette.danger, 0.12), color: palette.danger },
        standardInfo: { backgroundColor: 'rgba(255,255,255,0.06)', color: palette.text },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.07)' },
        bar: { backgroundColor: palette.accent, borderRadius: 99 },
      },
    },
    MuiTabs: { styleOverrides: { indicator: { backgroundColor: palette.accent, height: 2 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 42, '&.Mui-selected': { color: palette.accent } } } },
    MuiDivider: { styleOverrides: { root: { borderColor: palette.border } } },
    MuiMenu: { styleOverrides: { paper: { backgroundColor: palette.paperElev, border: `1px solid ${palette.border}`, backgroundImage: 'none' } } },
    MuiSelect: { styleOverrides: { icon: { color: palette.text3 } } },
  },
});

/** light theme: same structure, warm paper tones */
const lightTheme = createTheme({
  ...theme,
  palette: {
    ...theme.palette,
    mode: 'light',
    background: { default: '#F3F1EC', paper: '#FBFAF7' },
    text: { primary: '#23262B', secondary: '#5C5F66', disabled: '#9A9DA3' },
    primary: { main: '#6F8A76', contrastText: '#FFFFFF' },
    divider: 'rgba(35,38,43,0.12)',
  },
  components: {
    ...theme.components,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F3F1EC',
          color: '#23262B',
          backgroundImage: 'radial-gradient(1100px 460px at 30% -10%, rgba(111,138,118,0.06), transparent 60%)',
          backgroundAttachment: 'fixed',
          overflowX: 'hidden',
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' }, outlined: { borderColor: 'rgba(35,38,43,0.12)' } } },
    MuiDrawer: { styleOverrides: { paper: { backgroundColor: '#FBFAF7', borderRight: '1px solid rgba(35,38,43,0.10)' } } },
    MuiDialog: { styleOverrides: { paper: { backgroundColor: '#FFFFFF', border: '1px solid rgba(35,38,43,0.12)', borderRadius: 14, backgroundImage: 'none' } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: 'rgba(35,38,43,0.03)', '& fieldset': { borderColor: 'rgba(35,38,43,0.16)' } },
      },
    },
    MuiChip: { styleOverrides: { root: { backgroundColor: 'rgba(35,38,43,0.05)', color: '#5C5F66' } } },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          color: '#5C5F66',
          '&:hover': { backgroundColor: 'rgba(35,38,43,0.045)', color: '#23262B' },
          '&.Mui-selected': {
            color: '#2C3A31',
            backgroundColor: 'rgba(111,138,118,0.14)',
            '&:hover': { backgroundColor: 'rgba(111,138,118,0.2)' },
            '& .nav-ind': { opacity: 1 },
          },
        },
      },
    },
  },
});

export const themes = { dark: theme, light: lightTheme };
export default theme;
