import { Alert, Snackbar } from '@mui/material';
import { useUI } from '../uiContext';

export default function SnackbarHost() {
  const { snack, closeSnack } = useUI();
  return (
    <Snackbar open={!!snack} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} autoHideDuration={2600}>
      {snack ? <Alert severity={snack.severity} variant="standard" onClose={closeSnack} sx={{ width: '100%' }}>{snack.msg}</Alert> : undefined}
    </Snackbar>
  );
}
