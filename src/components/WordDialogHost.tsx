/* ============================================================
   ことばノート — MUI Dialog for add / edit word (id=wordForm,
   field names identical to v1 e2e contract) + duplicate guard
   ============================================================ */
import { useEffect, useMemo, useState, FormEvent } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Stack, Box, Typography, IconButton, Divider, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Store } from '../lib/store';
import { useUI } from '../uiContext';
import type { Word } from '../lib/types';

const F = {
  word: '', reading: '', partOfSpeech: '', translation: '',
  transitivity: '', example: '', note: '', tags: '',
};

export default function WordDialogHost() {
  const { dialogOpen, dialogWord, closeWordDialog, notify } = useUI();
  const [form, setForm] = useState({ ...F });
  const [dup, setDup] = useState<Word | null>(null);
  const [important, setImportant] = useState(false);
  const [hard, setHard] = useState(false);

  const editing = dialogWord;

  useEffect(() => {
    if (!dialogOpen) return;
    if (editing) {
      setForm({
        word: editing.word, reading: editing.reading, partOfSpeech: editing.partOfSpeech,
        translation: editing.translation, transitivity: editing.transitivity,
        example: editing.example, note: editing.note, tags: (editing.tags || []).join(', '),
      });
      setImportant(editing.important); setHard(editing.hard);
    } else {
      setForm({ ...F }); setImportant(false); setHard(false);
    }
    setDup(null);
  }, [dialogOpen, editing]);

  const set = (k: keyof typeof F) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const tags = useMemo(
    () => form.tags.split(/[,，]/).map(s => s.trim()).filter(Boolean),
    [form.tags],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.word.trim()) return;
    const fields = {
      word: form.word, reading: form.reading, partOfSpeech: form.partOfSpeech,
      translation: form.translation, transitivity: form.transitivity,
      example: form.example, note: form.note, tags,
      important, hard,
    };
    if (!editing) {
      const dupWord = Store.getWords().find(x => x.word.trim() === form.word.trim());
      if (dupWord) { setDup(dupWord); return; }
      await Store.addWord(fields);
      notify('保存しました');
    } else {
      await Store.updateWord(editing.id, fields);
      notify('更新しました');
    }
    closeWordDialog();
  }

  return (
    <Dialog
      open={dialogOpen}
      onClose={closeWordDialog}
      maxWidth="sm"
      fullWidth
      data-testid="word-dialog"
    >
      {dup ? (
        <>
          <DialogTitle>この単語はすでに登録されています</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              「<strong>{dup.word}</strong>」はすでに登録されています。重複データを増やさず、既存の単語を編集することをおすすめします。
            </Typography>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 600 }}>{dup.word}</Typography>
              {dup.reading && <Typography variant="body2" color="text.secondary">{dup.reading}</Typography>}
              {dup.translation && <Typography variant="body2" color="text.secondary">{dup.translation}</Typography>}
              <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                <Chip size="small" label={`${dup.reviewCount || 0}回復習`} />
                {dup.nextReviewAt && dup.nextReviewAt <= new Date().toISOString().slice(0, 10) && <Chip size="small" label="待復習" color="warning" />}
              </Stack>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button id="dupCancel" onClick={() => setDup(null)}>キャンセル</Button>
            <Button id="dupForce" variant="outlined" onClick={() => { setDup(null); /* force add path */ (async () => { await Store.addWord({ word: form.word, reading: form.reading, partOfSpeech: form.partOfSpeech, translation: form.translation, transitivity: form.transitivity, example: form.example, note: form.note, tags, important, hard }); notify('保存しました'); closeWordDialog(); })(); }}>
              それでも追加
            </Button>
          </DialogActions>
        </>
      ) : (
        <Box component="form" id="wordForm" onSubmit={submit} noValidate>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
            {editing ? '単語を編集' : '単語を追加'}
            <IconButton size="small" onClick={closeWordDialog} aria-label="閉じる"><CloseIcon fontSize="small" /></IconButton>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2.25} sx={{ pt: 0.5 }}>
              <TextField label="単語" name="word" value={form.word} onChange={set('word')} required autoFocus placeholder="食べる" />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.25}>
                <TextField label="読み方" name="reading" value={form.reading} onChange={set('reading')} placeholder="たべる" fullWidth />
                <TextField label="品詞" name="partOfSpeech" value={form.partOfSpeech} onChange={set('partOfSpeech')} placeholder="動詞 / 名詞 …" fullWidth />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.25}>
                <TextField label="中国語訳" name="translation" value={form.translation} onChange={set('translation')} placeholder="吃" fullWidth />
                <TextField label="自他動詞" name="transitivity" value={form.transitivity} onChange={set('transitivity')} placeholder="他動詞 / 自動詞" fullWidth />
              </Stack>
              <TextField label="例文" name="example" value={form.example} onChange={set('example')} placeholder="朝ご飯を食べる。" />
              <TextField label="メモ" name="note" value={form.note} onChange={set('note')} placeholder="覚え書き" multiline minRows={2} />
              <TextField label="タグ（カンマ区切り）" name="tags" value={form.tags} onChange={set('tags')} placeholder="JLPT N3, 生活" />
              {tags.length > 0 && (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {tags.map(t => <Chip key={t} size="small" label={t} />)}
                </Stack>
              )}
              <Stack direction="row" spacing={1}>
                <Chip
                  label="重要"
                  onClick={() => setImportant(v => !v)}
                  variant={important ? 'filled' : 'outlined'}
                  sx={important ? { bgcolor: t => alpha(t.palette.primary.main, 0.2), color: 'primary.main', borderColor: 'transparent' } : {}}
                />
                <Chip
                  label="覚えにくい"
                  onClick={() => setHard(v => !v)}
                  variant={hard ? 'filled' : 'outlined'}
                  sx={hard ? { bgcolor: t => alpha(t.palette.warning.main, 0.18), color: 'secondary.main', borderColor: 'transparent' } : {}}
                />
              </Stack>
            </Stack>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ px: 2.5, py: 1.75 }}>
            <Button onClick={closeWordDialog} color="inherit">キャンセル</Button>
            <Button type="submit" variant="contained">保存</Button>
          </DialogActions>
        </Box>
      )}
    </Dialog>
  );
}
