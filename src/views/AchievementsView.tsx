/* ============================================================
   ことばノート — Achievements: quiet record list, no badge wall
   ============================================================ */
import { Box, Typography, Stack, Divider, LinearProgress } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { Store } from '../lib/store';
import { Util } from '../lib/util-agg';
import { useStoreVersion } from '../hooks';

export default function AchievementsView() {
  useStoreVersion();
  const list = Store.getAchievements();
  const unlockedCount = list.filter(a => a.unlocked).length;

  return (
    <Stack spacing={3} data-testid="view-achievements">
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="h1">実績</Typography>
        <Typography variant="body2" color="text.disabled">{unlockedCount} / {list.length} 解除済み</Typography>
      </Stack>

      <Stack divider={<Divider flexItem />}>
        {list.map(a => (
          <Stack
            key={a.id}
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ py: 1.9 }}
            data-achv={a.id}
          >
            <Box sx={{ width: 34, textAlign: 'center', fontSize: '1.05rem', opacity: a.unlocked ? 1 : 0.35 }}>
              {a.unlocked ? a.icon : <LockIcon sx={{ fontSize: '1.05rem', verticalAlign: 'middle', color: 'text.secondary' }} />}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: a.unlocked ? 'text.primary' : 'text.secondary' }}>
                {a.name}
              </Typography>
              <Typography variant="body2" color="text.disabled">{a.desc}</Typography>
            </Box>
            {a.unlocked ? (
              <Typography variant="caption" sx={{ color: 'success.main', whiteSpace: 'nowrap' }}>
                ✓ {Util.formatDateShort(Util.key(new Date(a.unlockedAt!)))}
              </Typography>
            ) : (
              <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>未解除</Typography>
            )}
          </Stack>
        ))}
      </Stack>

      <Box>
        <LinearProgress variant="determinate" value={Math.round(unlockedCount / list.length * 100)} />
        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.75, display: 'block' }}>
          {unlockedCount} / {list.length}
        </Typography>
      </Box>
    </Stack>
  );
}
