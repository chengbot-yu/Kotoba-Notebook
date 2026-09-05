/* why isMobile? report breakpoint evaluation */
const mqs = {};
for (const q of ['(min-width:900px)', '(max-width:899.95px)', '(min-width:0px)']) {
  mqs[q] = window.matchMedia(q).matches;
}
const r = { innerW: window.innerWidth, mqs, hasToolbar: !!document.querySelector('.MuiToolbar-root') };
setResult(JSON.stringify(r, null, 1));
