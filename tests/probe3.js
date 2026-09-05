const r = {
  brandCount: document.querySelectorAll('[data-brand]').length,
  mobileToolbar: !!document.querySelector('[data-testid="mobile-toolbar"]'),
  drawerPaperCount: document.querySelectorAll('.MuiDrawer-paper').length,
  drawerPermant: document.querySelectorAll('.MuiDrawer-root.MuiDrawer-docked').length,
  bodyW: document.body.clientWidth,
  head: (document.body.innerText || '').slice(0, 80).replace(/\n/g, '|'),
};
setResult(JSON.stringify(r, null, 1));
