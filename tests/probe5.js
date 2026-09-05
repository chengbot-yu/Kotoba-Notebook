/* headless Chrome default window is 800x600; mobile breakpoint is md=900px.
   Report which drawer is being used and confirm breakpoint logic. */
const r = {
  innerW: window.innerWidth,
  mobileToolbarPresent: !!document.querySelector('header'),
  navParentChain: (() => {
    const nav = document.querySelector('[data-nav]');
    let el = nav; const chain = [];
    while (el && chain.length < 8) { chain.push(el.tagName + '.' + (el.className?.toString().match(/MuiDrawer-(docked|temporary|permanent)/)?.[1] || el.className?.toString().split(' ').slice(0,2).join('.'))); el = el.parentElement; }
    return chain;
  })(),
  brand: document.querySelectorAll('[data-brand]').length,
};
setResult(JSON.stringify(r, null, 1));
