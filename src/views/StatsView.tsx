/* ============================================================
   ことばノート — Stats: quiet, low-emphasis, list-like
   ============================================================ */
import { Box, Typography, Stack, Divider, Paper } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Store } from '../lib/store';
import { Util } from '../lib/util-agg';
import { weekTotals } from '../lib/stats';
import { MASTERY, MASTERY_ORDER } from '../lib/srs';
import { useStoreVersion } from '../hooks';

export default function StatsView() {
  useStoreVersion();
  const d = Store.dashboard();
  const words = Store.getWords();
  const studyDays = Store.getStudyDays();

  // last 30 days mini rows
  const days30 = [];
  for (let i = 29; i >= 0; i--) {
    const k = Util.addDays(Util.todayKey(), -i);
    const rec = studyDays.find(x => x.date === k);
    days30.push({ k, total: rec ? (rec.newWords || 0) + (rec.reviewCount || 0) : 0 });
  }
  const max30 = Math.max(1, ...days30.map(x => x.total));

  const byStatus = MASTERY_ORDER.map(m => ({ m, n: words.filter(w => (w.mastery || 'new') === m).length }));

  const week = weekTotals(studyDays);

  return (
    <Stack spacing={3.5} data-testid="view-stats">
      <Typography variant="h1">統計</Typography>

      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={{ xs: 2, sm: 4 }}>
        <Stat label="累計単語" value={Util.fmt(d.totalWords)} />
        <Stat label="学習日数" value={`${d.studyDays}日`} />
        <Stat label="最長連続" value={`${d.longest}日`} />
        <Stat label="累計復習" value={Util.fmt(d.totalReviews)} />
        <Stat label="今週" value={`新規${d.week.newWords}・復習${d.week.reviewCount}`} small />
      </Stack>

      <Divider />

      <Box>
        <Typography variant="h3" sx={{ mb: 1.5 }}>過去30日間</Typography>
        <Stack direction="row" alignItems="flex-end" spacing={0.4} sx={{ height: 72 }}>
          {days30.map(x => (
            <Box
              key={x.k}
              title={`${x.k}: ${x.total}`}
              sx={{
                flex: 1, minWidth: 3, maxWidth: 18, height: `${Math.max(2, x.total / max30 * 100)}%`,
                bgcolor: x.total ? t => alpha(t.palette.primary.main, 0.55) : t => alpha(t.palette.text.primary, 0.07),
                borderRadius: '3px 3px 1px 1px',
              }}
            />
          ))}
        </Stack>
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
          <Typography variant="caption" color="text.disabled">{Util.formatDateShort(days30[0].k)}</Typography>
          <Typography variant="caption" color="text.disabled">今日</Typography>
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ maxWidth: 460 }}>
        <Typography variant="h3" sx={{ mb: 1.5 }}>習得状態</Typography>
        <Stack spacing={1}>
          {byStatus.map(({ m, n }) => (
            <Stack key={m} direction="row" alignItems="center" spacing={1.5}>
              <Typography variant="body2" sx={{ width: 72, color: 'text.secondary' }}>{MASTERY[m].label}</Typography>
              <Box sx={{ flex: 1, height: 6, borderRadius: 99, bgcolor: 'divider', overflow: 'hidden' }}>
                <Box sx={{ width: `${words.length ? n / words.length * 100 : 0}%`, height: '100%', bgcolor: 'primary.main', opacity: 0.75, borderRadius: 99 }} />
              </Box>
              <Typography variant="body2" sx={{ width: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{n}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Divider />

      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'transparent' }}>
        <Typography variant="body2" color="text.secondary">
          今週（{Util.formatDateShort(week.weekStart)}〜）は新規 {week.newWords} 語・復習 {week.reviewCount} 回でした。
        </Typography>
      </Paper>
    </Stack>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.disabled">{label}</Typography>
      <Typography sx={{ fontSize: small ? '0.95rem' : '1.15rem', fontWeight: 600 }}>{value}</Typography>
    </Stack>
  );
}
