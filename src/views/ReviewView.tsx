/* ============================================================
   ことばノート — Review: mode select → card → judge → summary
   Visual: quiet paper-like card, balanced buttons
   ============================================================ */
import { useMemo, useState } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Box, Typography, Stack, Button, Paper, LinearProgress, Chip, Divider, TextField,
} from '@mui/material';
import { Store } from '../lib/store';
import { Util } from '../lib/util-agg';
import { SRS as SRSNS, requeueInSession } from '../lib/srs';

const SRS = SRSNS;
import { useStoreVersion } from '../hooks';
import type { ViewId } from '../App';
import type { ReviewMode, ReviewResult } from '../lib/types';

type Phase =
  | { s: 'start' }
  | { s: 'card'; revealed: boolean }
  | { s: 'summary' };

let queue: string[] = [];
let idx = 0;
let mode: ReviewMode = 'jp2cn';
let scope: 'due' | 'all' = 'due';
let tally = { remembered: 0, forgotten: 0 };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ReviewView({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  useStoreVersion();
  const [phase, setPhase] = useState<Phase>({ s: 'start' });
  const [, force] = useState(0);
  const rerender = () => force(n => n + 1);

  const start = (m: ReviewMode, sc: 'due' | 'all') => {
    let mm = m as ReviewMode | 'random';
    if ((mm as string) === 'random') mm = Math.random() < 0.5 ? 'jp2cn' : 'cn2jp';
    mode = mm as ReviewMode; scope = sc;
    let list = sc === 'all' ? [...Store.getWords()] : Store.dueQueue();
    if (mm === 'recall') list = list.slice(0, 10);
    if (Store.settings.order === 'random') list = shuffle(list);
    if (!list.length) return false;
    queue = list.map(w => w.id);
    idx = 0;
    tally = { remembered: 0, forgotten: 0 };
    setPhase({ s: 'card', revealed: false });
    return true;
  };

  const current = () => Store.getWord(queue[idx]);

  function judge(result: ReviewResult) {
    const w = current();
    if (w) {
      Store.recordReview(w.id, result, mode);
      tally[result === 'remembered' ? 'remembered' : 'forgotten']++;
      if (result === 'forgotten') requeueInSession(queue, idx);
    }
    idx++;
    if (idx >= queue.length) setPhase({ s: 'summary' });
    else setPhase({ s: 'card', revealed: false });
  }

  const prompt = useMemo(() => {
    if (phase.s !== 'card') return null;
    const w = current(); if (!w) return null;
    if (mode === 'jp2cn') return { main: w.word, sub: w.reading, input: '中国語の意味を入力', label: '日本語を見て、意味を思い出す' };
    if (mode === 'cn2jp') return { main: w.translation || w.word, sub: w.translation ? '' : '（翻訳未入力）', input: '日本語を入力', label: '中国語を見て、日本語を思い出す' };
    return { main: w.word, sub: w.reading, input: '', label: '単語の意味を思い出す' };
  }, [phase]);

  /* ---------- start ---------- */
  if (phase.s === 'start') {
    const due = Store.dashboard().dueCount;
    return (
      <Stack spacing={3} data-testid="view-review">
        <Box>
          <Typography variant="h1">復習</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            {due > 0 ? <>今日の待復習：<strong>{due}</strong> 語</> : '今日の待復習はありません'}
          </Typography>
        </Box>
        <Stack spacing={1.25}>
          {([
            ['jp2cn', '日本語 → 中国語', '単語を見て意味を思い出す'],
            ['cn2jp', '中国語 → 日本語', '意味を見て単語を思い出す'],
            ['recall', '単語を思い出す', '今日の復習枠・10語'],
          ] as const).map(([m, name, desc]) => (
            <Paper
              key={m}
              variant="outlined"
              component="button"
              data-mode={m}
              onClick={() => { if (!start(m, 'due')) setPhase({ s: 'summary' }); }}
              sx={{
                textAlign: 'left', p: 2, cursor: 'pointer', bgcolor: 'transparent',
                transition: 'border-color .18s, background-color .18s',
                '&:hover': {
                  borderColor: t => alpha(t.palette.primary.main, 0.4),
                  bgcolor: t => alpha(t.palette.text.primary, 0.025),
                },
              }}
            >
              <Typography sx={{ fontWeight: 600 }}>{name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>{desc}</Typography>
            </Paper>
          ))}
        </Stack>
        <Typography variant="caption" color="text.disabled">設定 → 訓練方向・順序 を変更できます</Typography>
      </Stack>
    );
  }

  /* ---------- summary ---------- */
  if (phase.s === 'summary') {
    const due = Store.dashboard().dueCount;
    const total = tally.remembered + tally.forgotten;
    return (
      <Stack spacing={3} alignItems="center" sx={{ py: { xs: 2, md: 6 } }} data-testid="review-summary">
        <Typography variant="h1">復習完了</Typography>
        <Stack direction="row" spacing={4} sx={{ textAlign: 'center' }}>
          <Box><Typography sx={{ fontSize: '1.5rem', fontWeight: 600, color: 'success.main' }}>{tally.remembered}</Typography><Typography variant="caption" color="text.secondary">覚えていた</Typography></Box>
          <Box><Typography sx={{ fontSize: '1.5rem', fontWeight: 600, color: 'secondary.main' }}>{tally.forgotten}</Typography><Typography variant="caption" color="text.secondary">忘れていた</Typography></Box>
          <Box><Typography sx={{ fontSize: '1.5rem', fontWeight: 600 }}>{total}</Typography><Typography variant="caption" color="text.secondary">合計</Typography></Box>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {due > 0 ? `まだ待復習が ${due} 語あります` : '今日の待復習はすべて完了しました'}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button id="btnAgain" variant="contained" onClick={() => start(mode, scope) && rerender()}>もう一度復習</Button>
          <Button id="btnHome" variant="outlined" onClick={() => onNavigate('home')}>ホームへ</Button>
        </Stack>
      </Stack>
    );
  }

  /* ---------- card ---------- */
  const w = current();
  if (!w) { setPhase({ s: 'start' }); return null; }
  const p = { now: idx + 1, total: queue.length };
  const pct = Math.round((idx / queue.length) * 100);
  const revealed = phase.s === 'card' && phase.revealed;

  return (
    <Stack spacing={3} alignItems="center" data-testid="view-review">
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ width: '100%', maxWidth: 560 }}>
        <Typography variant="caption" color="text.disabled">{prompt!.label}</Typography>
        <Typography variant="caption" color="text.disabled" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {p.now} / {p.total}
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct} sx={{ width: '100%', maxWidth: 560 }} />

      <Paper
        variant="outlined"
        data-testid="review-card"
        sx={{
          width: '100%', maxWidth: 560, mt: 2,
          px: { xs: 3, sm: 6 }, py: { xs: 5, sm: 7 },
          textAlign: 'center',
          bgcolor: t => alpha(t.palette.primary.main, 0.03),
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <Typography sx={{ fontSize: { xs: '2.1rem', sm: '2.6rem' }, fontWeight: 600, letterSpacing: '0.04em', lineHeight: 1.35 }}>
          {prompt!.main}
        </Typography>
        {prompt!.sub && <Typography color="text.secondary" sx={{ mt: 1, fontSize: '1.05rem' }}>{prompt!.sub}</Typography>}

        <Divider sx={{ my: 3, width: 56, mx: 'auto', borderColor: t => alpha(t.palette.text.primary, 0.16) }} />

        {!revealed ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {prompt!.input ? '想一想，然后输入答案' : '想一想，这个词是什么意思？'}
            </Typography>
            {prompt!.input && (
              <TextField
                id="reviewInput"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') setPhase({ s: 'card', revealed: true }); }}
                placeholder={prompt!.input}
                variant="outlined"
                sx={{
                  width: '100%', maxWidth: 340, mb: 2.5,
                  '& .MuiOutlinedInput-root': { bgcolor: t => alpha(t.palette.text.primary, 0.045) },
                  '& .MuiOutlinedInput-input': { textAlign: 'center', fontSize: '1rem' },
                }}
              />
            )}
            <div>
              <Button id="btnReveal" variant="outlined" onClick={() => setPhase({ s: 'card', revealed: true })}>
                答えを見る
              </Button>
            </div>
          </>
        ) : (
          <Stack spacing={1.25} alignItems="center">
            {mode !== 'cn2jp' && <Typography sx={{ fontSize: '1.9rem', fontWeight: 600 }}>{w.word}</Typography>}
            {mode === 'cn2jp' && <Typography sx={{ fontSize: '1.9rem', fontWeight: 600 }}>{w.word}</Typography>}
            {w.reading && <Typography color="text.secondary">{w.reading}</Typography>}
            {(w.partOfSpeech || w.transitivity) && (
              <Typography variant="caption" color="text.disabled">
                {[w.partOfSpeech, w.transitivity].filter(Boolean).join(' · ')}
              </Typography>
            )}
            {w.translation && (
              <Typography sx={{ fontSize: '1.28rem', fontWeight: 600, color: 'primary.main', mt: 1 }}>
                {w.translation}
              </Typography>
            )}
            {w.example && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>{w.example}</Typography>}
            {w.note && <Typography variant="caption" color="text.disabled">{w.note}</Typography>}
            {(w.tags || []).length > 0 && (
              <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                {w.tags.map(t => <Chip key={t} size="small" label={t} />)}
              </Stack>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4, width: { xs: '100%', sm: 'auto' }, justifyContent: 'center' }}>
              <Button
                id="btnForget"
                variant="outlined"
                color="secondary"
                onClick={() => judge('forgotten')}
                sx={{
                  borderColor: t => alpha(t.palette.warning.main, 0.45),
                  color: 'secondary.main',
                  '&:hover': { borderColor: t => alpha(t.palette.warning.main, 0.7), bgcolor: t => alpha(t.palette.warning.main, 0.08) },
                }}
              >
                忘れていた
              </Button>
              <Button
                id="btnRemember"
                variant="outlined"
                onClick={() => judge('remembered')}
                sx={{
                  borderColor: t => alpha(t.palette.success.main, 0.5),
                  color: 'success.main',
                  '&:hover': { borderColor: t => alpha(t.palette.success.main, 0.75), bgcolor: t => alpha(t.palette.success.main, 0.08) },
                }}
              >
                覚えていた
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
