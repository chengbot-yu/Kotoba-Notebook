/* ============================================================
   ことばノート — Calendar: monday-first 月火水木金土日 grid
   ============================================================ */
import { useMemo, useState } from 'react';
import { alpha } from '@mui/material/styles';
import { Box, Typography, Stack, IconButton, Button, Divider, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Store } from '../lib/store';
import { Util, WEEK_MON } from '../lib/util-agg';
import { calendarMonth, type CalCell } from '../lib/stats';
import { useStoreVersion } from '../hooks';

const now = new Date();

export default function CalendarView() {
  useStoreVersion();
  const [y, setY] = useState(now.getFullYear());
  const [m, setM] = useState(now.getMonth() + 1);
  const [sel, setSel] = useState(Util.todayKey());

  const studyDays = Store.getStudyDays();
  const words = Store.getWords();
  const today = Util.todayKey();

  const cells = useMemo(() => calendarMonth(studyDays, y, m), [studyDays, y, m]);
  const selWords = words.filter(w => Util.key(new Date(w.createdAt)) === sel);
  const selRec = studyDays.find(d => d.date === sel);

  function shift(delta: number) {
    let ny = y, nm = m + delta;
    if (nm < 1) { nm = 12; ny--; }
    if (nm > 12) { nm = 1; ny++; }
    setY(ny); setM(nm);
  }

  function cellClass(c: CalCell) {
    if (!c.key) return '';
    const cls = [`level-${c.level}`];
    if (c.key === today) cls.push('is-today');
    if (c.key === sel) cls.push('is-sel');
    if (c.key > today) cls.push('is-future');
    return cls.join(' ');
  }

  return (
    <Stack spacing={3} data-testid="view-calendar">
      <Typography variant="h1">カレンダー</Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2.5, md: 4 }}>
        {/* month grid */}
        <Box sx={{ flex: 1, minWidth: 0, maxWidth: { md: 420 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <IconButton size="small" id="calPrev" onClick={() => shift(-1)} aria-label="前の月"><ArrowBackIcon fontSize="small" /></IconButton>
            <Typography data-testid="cal-title" sx={{ fontWeight: 600, fontSize: '1.02rem', letterSpacing: '0.04em' }}>
              {y}年{m}月
            </Typography>
            <IconButton size="small" id="calNext" onClick={() => shift(1)} aria-label="次の月"><ArrowForwardIcon fontSize="small" /></IconButton>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.75 }} className="cal-week">
            {WEEK_MON.map(w => (
              <Typography key={w} variant="caption" color="text.disabled" sx={{ textAlign: 'center', fontSize: '0.75rem' }}>
                {w}
              </Typography>
            ))}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 0.5 }}>
            {cells.map((c, i) => c.key ? (
              <Button
                key={c.key}
                className={cellClass(c)}
                data-key={c.key}
                onClick={() => setSel(c.key!)}
                sx={{
                  minWidth: 0, height: { xs: 40, sm: 44 }, p: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.4,
                  borderRadius: 2,
                  color: c.key > today ? 'text.disabled' : c.level >= 3 ? 'text.primary' : 'text.secondary',
                  bgcolor: c.level > 0 ? t => alpha(t.palette.primary.main, 0.05 + c.level * 0.055) : 'transparent',
                  border: c.key === sel
                    ? t => `1px solid ${alpha(t.palette.primary.main, 0.55)}`
                    : c.key === today
                      ? t => `1px solid ${alpha(t.palette.text.primary, 0.25)}`
                      : '1px solid transparent',
                  '&:hover': {
                    bgcolor: c.level > 0
                      ? t => alpha(t.palette.primary.main, 0.09 + c.level * 0.055)
                      : t => alpha(t.palette.text.primary, 0.04),
                  },
                }}
              >
                <Typography component="span" sx={{ fontSize: '0.85rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{c.day}</Typography>
                {c.level > 0 && <Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main', opacity: 0.85 }} />}
              </Button>
            ) : (
              <Box key={`e${i}`} />
            ))}
          </Box>
        </Box>

        {/* day detail */}
        <Box sx={{ flex: 1, minWidth: 0 }} id="calDetail" data-testid="cal-detail">
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Typography sx={{ fontWeight: 600 }}>{Util.formatDateJP(sel)}</Typography>
            <Typography
              sx={{
                fontSize: '0.85rem', fontWeight: 600, color: 'primary.main',
                width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid', borderColor: t => alpha(t.palette.primary.main, 0.35), borderRadius: '50%',
              }}
            >
              {Util.weekdayKanji(sel)}
            </Typography>
            {sel === today && <Chip size="small" label="今日" />}
          </Stack>
          <Divider sx={{ my: 1.5 }} />
          <Stack direction="row" spacing={3} sx={{ mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              新規 <Box component="strong" sx={{ color: 'text.primary', fontWeight: 700 }}>{selRec?.newWords || 0}</Box>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              復習 <Box component="strong" sx={{ color: 'text.primary', fontWeight: 700 }}>{selRec?.reviewCount || 0}</Box>
            </Typography>
          </Stack>
          {selWords.length > 0 ? (
            <Stack spacing={0.5}>
              {selWords.map(w => (
                <Stack key={w.id} direction="row" spacing={1.5} alignItems="baseline">
                  <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>{w.word}</Typography>
                  {w.reading && <Typography variant="caption" color="text.secondary">{w.reading}</Typography>}
                  {w.translation && <Typography variant="caption" color="text.secondary">{w.translation}</Typography>}
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.disabled">
              {selRec && (selRec.newWords + selRec.reviewCount > 0) ? 'この日は復習のみでした' : 'この日の記録はありません'}
            </Typography>
          )}
        </Box>
      </Stack>
    </Stack>
  );
}
