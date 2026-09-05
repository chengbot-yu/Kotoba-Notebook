/* ============================================================
   ことばノート — Settings: theme / training / data management
   ============================================================ */
import { useRef } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Box, Typography, Stack, Button, Divider, Chip, ToggleButtonGroup, ToggleButton,
  TextField, MenuItem,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { Store } from '../lib/store';
import { useStoreVersion } from '../hooks';
import { useUI } from '../uiContext';
import type { ExportPayload } from '../lib/store';

export default function SettingsView() {
  useStoreVersion();
  const { notify } = useUI();
  const s = Store.settings;
  const fileRef = useRef<HTMLInputElement>(null);

  async function doExport() {
    const data = Store.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kotoba-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    notify('エクスポートしました');
  }

  async function doImport(file: File) {
    try {
      const obj = JSON.parse(await file.text()) as ExportPayload;
      await Store.importData(obj, 'replace');
      notify('インポートしました');
    } catch {
      notify('JSONとして読み込めませんでした', 'warning');
    }
  }

  async function clearAll() {
    if (!confirm('すべてのデータを消去しますか？この操作は取り消せません。')) return;
    await Store.clearAll();
    notify('すべてのデータを消去しました', 'info');
  }

  return (
    <Stack spacing={3} data-testid="view-settings" sx={{ maxWidth: 640 }}>
      <Typography variant="h1">設定</Typography>

      <Section title="テーマ">
        <ToggleButtonGroup
          exclusive
          size="small"
          value={s.theme}
          onChange={(_, v) => v && Store.patchSettings({ theme: v })}
        >
          <ToggleButton value="dark" data-theme-btn="dark">ダーク</ToggleButton>
          <ToggleButton value="light" data-theme-btn="light">ライト</ToggleButton>
        </ToggleButtonGroup>
      </Section>

      <Divider />

      <Section title="トレーニング">
        <Stack spacing={2} sx={{ maxWidth: 360 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent={{ sm: 'space-between' }} alignItems={{ sm: 'center' }} spacing={0.75}>
            <Typography variant="body2" color="text.secondary">既定の訓練方向</Typography>
            <TextField
              select
              size="small"
              value={s.dir}
              onChange={e => Store.patchSettings({ dir: e.target.value as never })}
              sx={{ width: 200 }}
              data-testid="setting-dir"
            >
              <MenuItem value="jp2cn">日本語 → 中国語</MenuItem>
              <MenuItem value="cn2jp">中国語 → 日本語</MenuItem>
              <MenuItem value="random">ランダム</MenuItem>
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent={{ sm: 'space-between' }} alignItems={{ sm: 'center' }} spacing={0.75}>
            <Typography variant="body2" color="text.secondary">復習の順序</Typography>
            <TextField
              select
              size="small"
              value={s.order}
              onChange={e => Store.patchSettings({ order: e.target.value as never })}
              sx={{ width: 200 }}
              data-testid="setting-order"
            >
              <MenuItem value="random">ランダム</MenuItem>
              <MenuItem value="input">入力順</MenuItem>
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent={{ sm: 'space-between' }} alignItems={{ sm: 'center' }} spacing={0.75}>
            <Typography variant="body2" color="text.secondary">1日の目標</Typography>
            <TextField
              select
              size="small"
              value={String(s.goal)}
              onChange={e => Store.patchSettings({ goal: Number(e.target.value) })}
              sx={{ width: 200 }}
              data-testid="setting-goal"
            >
              {[5, 10, 20, 30, 50].map(n => <MenuItem key={n} value={n}>{n}語</MenuItem>)}
            </TextField>
          </Stack>
        </Stack>
      </Section>

      <Divider />

      <Section title="データ管理">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          保存先：IndexedDB（ブラウザ内に保存）。データはこのブラウザから外部に送信されません。バックアップを定期的にエクスポートしてください。
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={doExport}>エクスポート</Button>
          <Button variant="outlined" size="small" startIcon={<UploadIcon />} onClick={() => fileRef.current?.click()}>インポート</Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={clearAll}
            sx={{ '&:hover': { borderColor: t => alpha(t.palette.error.main, 0.5) } }}
          >
            すべて消去
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }}
          />
        </Stack>
      </Section>

      <Divider />

      <Section title="アプリについて">
        <Typography variant="body2" color="text.secondary">
          ことばノート v2.0 — React + Material UI。あなた自身の日本語単語帳。
        </Typography>
        <Chip size="small" label="完全オフライン" sx={{ mt: 1 }} />
      </Section>
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Box>
  );
}
