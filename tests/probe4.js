/* debug: why isMobile true at 754px? report matchMedia + drawer DOM */
const r = {
  bodyW: document.body.clientWidth,
  innerW: window.innerWidth,
  drawerVariants: Array.from(document.querySelectorAll('.MuiDrawer-root')).map(d => d.className.match(/MuiDrawer-(docked|temporary|permanent)/)?.[1]),
  brandInDocked: !!document.querySelector('.MuiDrawer-docked [data-brand]'),
  brandAnywhere: document.querySelectorAll('[data-brand]').length,
  anyDockedHTML: (document.querySelector('.MuiDrawer-root')?.innerHTML || '').slice(0, 100),
};
setResult(JSON.stringify(r, null, 1));
