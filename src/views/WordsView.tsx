/* ============================================================
   ことばノート — Words: search + filter + List of words
   ============================================================ */
import { useMemo, useState } from 'react';
import {
  Box, Typography, Stack, TextField, MenuItem, List, ListItemButton,
  ListItemText, Divider, Chip, Button, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { Store } from '../lib/store';
import { Util } from '../lib/util-agg';
import { SRS as SRSNS, MASTERY, MASTERY_ORDER } from '../lib/srs';

const SRS = SRSNS;
import { useStoreVersion } from '../hooks';
import { useUI } from '../uiContext';

export default function WordsView() {
  useStoreVersion();
  const { openWordDialog, notify } = useUI();
  const words = Store.getWords();
  const today = Util.todayKey();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [dateF, setDateF] = useState('all');
  const [pos, setPos] = useState('all');
  const [sort, setSort] = useState('new');

  const list = useMemo(() => {
    let l = [...words];
    const qq = q.trim().toLowerCase();
    if (qq) {
      l = l.filter(w =>
        w.word.toLowerCase().includes(qq) ||
        (w.reading || '').toLowerCase().includes(qq) ||
        (w.translation || '').toLowerCase().includes(qq) ||
        (w.note || '').toLowerCase().includes(qq) ||
        (w.tags || []).some(t => t.toLowerCase().includes(qq)));
    }
    if (status !== 'all') l = l.filter(w => (w.mastery || 'new') === status);
    if (dateF === 'today') l = l.filter(w => Util.key(new Date(w.createdAt)) === today);
    if (dateF === 'week') { const ws = Util.weekStartKey(today); l = l.filter(w => Util.dateInWeek(Util.key(new Date(w.createdAt)), ws)); }
    if (dateF === 'month') l = l.filter(w => Util.key(new Date(w.createdAt)).startsWith(today.slice(0, 7)));
    if (pos !== 'all') l = l.filter(w => w.partOfSpeech === pos);
    if (sort === 'new') l.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === 'old') l.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (sort === 'due') l.sort((a, b) => (a.nextReviewAt || '9999').localeCompare(b.nextReviewAt || '9999'));
    if (sort === 'alpha') l.sort((a, b) => a.word.localeCompare(b.word, 'ja'));
    return l;
  }, [words, q, status, dateF, pos, sort, today]);

  const posOptions = useMemo(() => Array.from(new Set(words.map(w => w.partOfSpeech).filter(Boolean))), [words]);

  async function del(id: string) {
    const w = Store.getWord(id);
    if (!w) return;
    if (!confirm(`「${w.word}」を削除しますか？`)) return;
    await Store.deleteWord(id);
    notify('単語を削除しました', 'info');
  }

  if (!words.length) {
    return (
      <Stack spacing={3} data-testid="view-words">
        <Typography variant="h1">単語</Typography>
        <Typography color="text.secondary">まだ単語がありません。最初の1語を記録しましょう。</Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} data-testid="view-words">
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'baseline' }} spacing={1}>
        <Typography variant="h1">単語</Typography>
        <Typography variant="body2" color="text.disabled">全 {Util.fmt(words.length)} 語</Typography>
      </Stack>

      {/* toolbar */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField
          size="small"
          placeholder="検索：単語・読み・訳・タグ・メモ"
          value={q}
          onChange={e => setQ(e.target.value)}
          data-testid="word-search"
          sx={{ flex: 2 }}
          slotProps={{
            input: { startAdornment: <SearchIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 0.75 }} /> },
          }}
        />
        <Stack direction="row" spacing={1.5} sx={{ flex: 3, '& > *': { flex: 1 } }}>
          <TextField select size="small" label="状態" value={status} onChange={e => setStatus(e.target.value)}>
            <MenuItem value="all">すべて</MenuItem>
            {MASTERY_ORDER.map(m => <MenuItem key={m} value={m}>{MASTERY[m].label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="日付" value={dateF} onChange={e => setDateF(e.target.value)}>
            <MenuItem value="all">すべて</MenuItem>
            <MenuItem value="today">今日</MenuItem>
            <MenuItem value="week">今週</MenuItem>
            <MenuItem value="month">今月</MenuItem>
          </TextField>
          <TextField select size="small" label="品詞" value={pos} onChange={e => setPos(e.target.value)}>
            <MenuItem value="all">すべて</MenuItem>
            {posOptions.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="並び" value={sort} onChange={e => setSort(e.target.value)}>
            <MenuItem value="new">新しい</MenuItem>
            <MenuItem value="old">古い</MenuItem>
            <MenuItem value="due">復習順</MenuItem>
            <MenuItem value="alpha">あいうえお</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      {/* word list — continuous notebook-style rows */}
      <List disablePadding>
        {list.map((w, i) => {
          const due = SRS.isDue(w, today);
          return (
            <Box key={w.id}>
              {i > 0 && <Divider component="li" />}
              <ListItemButton
                data-testid="word-row"
                onClick={() => openWordDialog(w)}
                sx={{ px: { xs: 0.5, sm: 1 }, py: 1.6, alignItems: 'flex-start' }}
              >
                <ListItemText
                  primary={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}>
                      <Typography component="span" sx={{ fontSize: '1.22rem', fontWeight: 600, letterSpacing: '0.02em' }}>
                        {w.word}
                        {w.important && <Box component="span" sx={{ color: 'secondary.main', fontSize: '0.8em', ml: 0.75, verticalAlign: 'middle' }}>★</Box>}
                        {w.hard && <Box component="span" sx={{ color: 'warning.main', fontSize: '0.8em', ml: 0.5, verticalAlign: 'middle' }}>◯</Box>}
                      </Typography>
                      {w.reading && <Typography component="span" color="text.secondary">{w.reading}</Typography>}
                    </Box>
                  }
                  secondary={
                    <Box component="span" sx={{ display: 'block', mt: 0.4 }}>
                      <Box component="span" sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}>
                        {w.translation && <Typography component="span" variant="body2" sx={{ color: 'text.primary' }}>{w.translation}</Typography>}
                        {(w.partOfSpeech || w.transitivity) && (
                          <Typography component="span" variant="caption" color="text.disabled">
                            {[w.partOfSpeech, w.transitivity].filter(Boolean).join(' · ')}
                          </Typography>
                        )}
                        {due && <Chip size="small" label="待復習" color="warning" sx={{ height: 19, fontSize: '0.68rem' }} />}
                      </Box>
                      {(w.tags || []).length > 0 && (
                        <Box component="span" sx={{ display: 'flex', gap: 0.5, mt: 0.75, flexWrap: 'wrap' }}>
                          {(w.tags || []).slice(0, 4).map(t => <Chip key={t} size="small" label={t} />)}
                        </Box>
                      )}
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'span' }}
                />
                <Stack direction="row" alignItems="center" spacing={0.25} sx={{ mt: 0.25 }}>
                  <Typography variant="caption" color="text.disabled" sx={{ mr: 1, whiteSpace: 'nowrap' }}>
                    {MASTERY[w.mastery || 'new'].label}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label="編集"
                    onClick={e => { e.stopPropagation(); openWordDialog(w); }}
                  >
                    <EditIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                  <IconButton size="small" aria-label="削除" onClick={e => { e.stopPropagation(); del(w.id); }}>
                    <DeleteIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Stack>
              </ListItemButton>
            </Box>
          );
        })}
      </List>
      {list.length === 0 && (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">条件に一致する単語はありません</Typography>
          <Button size="small" onClick={() => { setQ(''); setStatus('all'); setDateF('all'); setPos('all'); }} sx={{ mt: 1 }}>
            フィルタをリセット
          </Button>
        </Box>
      )}
    </Stack>
  );
}
