/* Computed-style acceptance checks (run inside the real page via ev-run).
   Verifies the two hard visual requirements objectively:
   1. ことばノート wordmark: 20-22px, weight 600, primary text, no underline, not an <a>.
   2. Dark theme: #111318 bg, #9CB5A2 sage accent, no purple/blue gradients. */
const tick = ms => new Promise(r => setTimeout(r, ms));
await tick(500);
const lines = [];
let pass = 0, fail = 0;
const ok = (name, cond, msg = '') => { if (cond) { pass++; lines.push('PASS ' + name + (msg ? ' [' + msg + ']' : '')); } else { fail++; lines.push('FAIL ' + name + (msg ? ' :: ' + msg : '')); } };
const gs = (el, prop) => el ? getComputedStyle(el)[prop] : null;

/* ---------- brand wordmark ---------- */
const brandBox = document.querySelector('[data-brand]');
ok('brand-exists', !!brandBox);
const brandText = brandBox && brandBox.querySelector('.MuiTypography-root');
ok('brand-is-typography', !!brandText && brandText.textContent.trim() === 'ことばノート');
if (brandText) {
  const cs = getComputedStyle(brandText);
  ok('brand-size-20-22px', parseFloat(cs.fontSize) >= 20 && parseFloat(cs.fontSize) <= 22.5, cs.fontSize);
  ok('brand-weight-600', Number(cs.fontWeight) === 600, cs.fontWeight);
  ok('brand-primary-text', cs.color === 'rgb(242, 242, 239)', cs.color);
  ok('brand-no-underline', cs.textDecorationLine === 'none', cs.textDecorationLine);
  ok('brand-not-anchor', brandText.tagName !== 'A' && !brandText.closest('a'), brandText.tagName);
  ok('brand-letter-spacing', parseFloat(cs.letterSpacing) > 0, cs.letterSpacing);
  const box = brandText.getBoundingClientRect();
  const drawer = document.querySelector('.MuiDrawer-paper');
  const originX = drawer ? drawer.getBoundingClientRect().left : 0;
  ok('brand-not-glued-to-edge', box.left - originX >= 8 && box.top >= 8, `padLeft=${Math.round(box.left - originX)} top=${Math.round(box.top)}`);
}

/* ---------- dark theme tokens ---------- */
ok('body-bg-111318', gs(document.body, 'backgroundColor') === 'rgb(17, 19, 24)', gs(document.body, 'backgroundColor'));
ok('body-text-warm-white', gs(document.body, 'color') === 'rgb(242, 242, 239)', gs(document.body, 'color'));

/* primary CTA = sage, dark text, NOT blue/purple, NOT gradient */
const cta = Array.from(document.querySelectorAll('button.MuiButton-containedPrimary'))[0];
ok('cta-exists', !!cta);
if (cta) {
  const cs = getComputedStyle(cta);
  ok('cta-sage-9CB5A2', cs.backgroundColor === 'rgb(156, 181, 162)', cs.backgroundColor);
  ok('cta-no-gradient', !cs.backgroundImage || cs.backgroundImage === 'none', cs.backgroundImage);
}

/* nav selected state: subtle sage tint + indicator, not a giant capsule */
const sel = document.querySelector('[data-nav].Mui-selected');
ok('nav-selected-exists', !!sel);
if (sel) {
  const cs = getComputedStyle(sel);
  ok('nav-selected-sage-tint', cs.backgroundColor.startsWith('rgba(156, 181, 162'), cs.backgroundColor);
  ok('nav-selected-radius-small', parseFloat(cs.borderRadius) <= 12, cs.borderRadius);
  const ind = sel.querySelector('.nav-ind');
  ok('nav-indicator-visible', ind && Number(getComputedStyle(ind).opacity) === 1, ind && getComputedStyle(ind).opacity);
}

/* ---------- scan whole page for banned blue/purple surfaces ---------- */
const all = Array.from(document.querySelectorAll('body *')).filter(el => el.offsetWidth > 0);
const banned = [];
for (const el of all) {
  const cs = getComputedStyle(el);
  const bg = (cs.backgroundColor || '') + ' ' + (cs.backgroundImage || '');
  if (/linear-gradient/i.test(cs.backgroundImage || '') && !/rgba\(156, 181, 162/.test(cs.backgroundImage)) {
    banned.push(el.tagName + '.' + (el.className && el.className.toString ? el.className.toString().slice(0, 40) : '') + ' gradient=' + cs.backgroundImage.slice(0, 80));
  }
  const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const vividBluePurple = b > 150 && b > r + 40 && b > g + 40;
    if (vividBluePurple) banned.push(el.tagName + ' blue/purple bg rgb(' + r + ',' + g + ',' + b + ')');
  }
}
ok('no-blue-purple-surfaces', banned.length === 0, banned.slice(0, 3).join(' | ') || 'clean');

/* ---------- glass usage is restrained ---------- */
const blurred = all.filter(el => /backdrop-filter/.test(el.style.cssText) || (getComputedStyle(el).backdropFilter && getComputedStyle(el).backdropFilter !== 'none'));
ok('glass-restrained', blurred.length <= 6, 'blurred=' + blurred.length);

lines.push(`RESULT pass=${pass} fail=${fail}`);
setResult(lines.join('\n'));
