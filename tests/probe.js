const r = [];
r.push('href=' + location.href);
const root = document.getElementById('root');
r.push('root=' + !!root);
r.push('rootChildren=' + (root ? root.children.length : -1));
r.push('rootHTMLlen=' + (root ? root.innerHTML.length : -1));
r.push('bodyTextHead=' + (document.body.innerText || '(empty)').slice(0, 300).replace(/\n/g, '|'));
r.push('PROBE_DONE');
 setResult(r.join('\n'));
