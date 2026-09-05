/* ============================================================
   ことばノート — Home: 今日の学習 / 今日の単語 list / 復習 entry
   ============================================================ */
import {
  Box, Typography, Stack, Button, List, ListItemButton, ListItemText,
  Divider, Chip, Paper,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Store } from '../lib/store';
import { Util } from '../lib/util-agg';
import { useStoreVersion } from '../hooks';
import { useUI } from '../uiContext';
import type { ViewId } from '../App';

export default function HomeView({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  useStoreVersion();
  const { openWordDialog } = useUI();
  const d = Store.dashboard();
  const today = Util.todayKey();
  const wk = Util.weekdayKanji(today);
  const words = Store.getWords();
  const todayWords = words.filter(w => Util.key(new Date(w.createdAt)) === today);
  const shown = todayWords.slice(0, 8);
  const due = Store.dueQueue();

  return (
    <Stack spacing={4.5} data-testid="view-home">
      {/* ---- first layer: today ---- */}
      <Box>
        <Typography variant="h1">今日の学習</Typography>
        <Stack direction="row" alignItems="baseline" spacing={1.25} sx={{ mt: 0.75 }}>
          <Typography color="text.secondary">{Util.formatDateJP(today)}</Typography>
          <Typography
            sx={{
              fontSize: '0.95rem', fontWeight: 600, color: 'primary.main',
              width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid', borderColor: t => alpha(t.palette.primary.main, 0.35), borderRadius: '50%',
            }}
            aria-label={`曜日: ${wk}`}
          >
            {wk}
          </Typography>
        </Stack>
        <Typography color="text.secondary" sx={{ mt: 1.25 }}>
          {words.length === 0
            ? 'まだ単語がありません'
            : `今日は ${d.today.newWords} 語を記録${d.today.reviewCount ? ` · ${d.today.reviewCount} 回復習` : ''}`}
        </Typography>
      </Box>

      {/* ---- CTA ---- */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => openWordDialog()} data-testid="home-add">
          今日の単語を追加
        </Button>
        <Button variant="outlined" size="large" endIcon={<ArrowForwardIcon />} onClick={() => onNavigate('review')} data-testid="home-review">
          復習を始める{due.length > 0 ? `（${due.length}語）` : ''}
        </Button>
      </Stack>

      {/* ---- today words ---- */}
      <Box>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h3">今日の単語</Typography>
          {todayWords.length > 0 && <Typography variant="caption" color="text.disabled">{todayWords.length} 語</Typography>}
        </Stack>
        {todayWords.length === 0 ? (
          <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>
            {words.length === 0
              ? '今日から始めよう。最初の1語を記録して、あなたの単語帳をつくりましょう。'
              : 'まだ今日の単語はありません。'}
          </Typography>
        ) : (
          <List disablePadding sx={{ width: '100%' }}>
            {shown.map((w, i) => (
              <ListItemButton
                key={w.id}
                data-testid="home-word-row"
                onClick={() => onNavigate('words')}
                sx={{ px: 0.5, py: 1.35, borderRadius: 2 }}
              >
                <Typography component="span" sx={{ width: 30, flexShrink: 0, color: 'text.disabled', fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
                  {String(i + 1).padStart(2, '0')}
                </Typography>
                <ListItemText
                  primary={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}>
                      <Typography component="span" sx={{ fontSize: '1.18rem', fontWeight: 600, letterSpacing: '0.02em' }}>{w.word}</Typography>
                      {w.reading && <Typography component="span" color="text.secondary" sx={{ fontSize: '0.88rem' }}>{w.reading}</Typography>}
                      {w.translation && <Typography component="span" color="text.secondary" sx={{ fontSize: '0.9rem' }}>{w.translation}</Typography>}
                    </Box>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
        {todayWords.length > 8 && (
          <Button size="small" onClick={() => onNavigate('words')} sx={{ mt: 0.5 }}>
            ほか {todayWords.length - 8} 語を表示
          </Button>
        )}
      </Box>

      <Divider />

      {/* ---- light stats line ---- */}
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={{ xs: 1.5, sm: 3 }}>
        <MiniStat label="連続学習" value={`${d.streak}日`} />
        <MiniStat label="累計" value={`${d.totalWords}語`} />
        <MiniStat label="待復習" value={`${d.dueCount}語`} />
        <MiniStat label="学習日数" value={`${d.studyDays}日`} />
      </Stack>
    </Stack>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="baseline">
      <Typography variant="caption" color="text.disabled">{label}</Typography>
      <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>{value}</Typography>
    </Stack>
  );
}
