/* quick DOM probe: count key markers */
const r = {
  brand: !!document.querySelector('[data-brand]'),
  navCount: document.querySelectorAll('[data-nav]').length,
  calTitle: !!document.querySelector('[data-testid="cal-title"]'),
  bodyHead: (document.body.innerText || '').slice(0, 120).replace(/\n/g, '|'),
  hash: location.hash,
};
setResult(JSON.stringify(r, null, 1));
