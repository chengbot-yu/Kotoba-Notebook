/* ============================================================
   ことばノート — app boot / router / navigation / theme
   ============================================================ */
const App = (() => {
  const VIEWS = ['home', 'words', 'review', 'calendar', 'achievements', 'stats', 'settings'];
  let current = 'home';
  let reviewRendered = false;

  function getStudyDays() { return Store.getStudyDays(); }

  function applyTheme() {
    document.body.classList.toggle('light', Store.settings.theme === 'light');
  }

  function updateNavBadges() {
    const due = Store.dashboard().dueCount;
    document.querySelectorAll('[data-nav-badge]').forEach(el => {
      el.textContent = due > 0 ? String(due) : '';
      el.classList.toggle('show', due > 0);
    });
  }

  function navigate(view, opts = {}) {
    if (!VIEWS.includes(view)) view = 'home';
    current = view;
    location.hash = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
    const root = document.getElementById(`view-${view}`);
    root.classList.add('active');
    root.scrollTop = 0;

    switch (view) {
      case 'home': UI.renderHome(root); break;
      case 'words': UI.renderWords(root); break;
      case 'review':
        if (!reviewRendered || opts.force) { Review.setRoot(root); reviewRendered = true; }
        Review.renderRoot();
        break;
      case 'calendar': UI.renderCalendar(root); break;
      case 'achievements': UI.renderAchievements(root); break;
      case 'stats': UI.renderStats(root); break;
      case 'settings': UI.renderSettings(root); break;
    }
    updateNavBadges();
    window.scrollTo(0, 0);
  }

  function refresh() {
    navigate(current, { force: current === 'review' });
  }

  function boot() {
    UIModal.init();
    applyTheme();
    const fromHash = location.hash.replace('#', '');
    navigate(VIEWS.includes(fromHash) ? fromHash : 'home');
  }

  /* startup due reminder */
  function maybeNotify() {
    const s = Store.settings;
    if (!s.notify) return;
    const due = Store.dashboard().dueCount;
    if (due <= 0) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('📖 ことばノート', { body: `今日の待復習は ${due} 語あります。` }); } catch (e) { /* some browsers require SW */ }
    }
  }

  return { VIEWS, navigate, refresh, boot, applyTheme, getStudyDays, maybeNotify, current: () => current };
})();

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Store.init();
    App.boot();
    App.maybeNotify();
  } catch (e) {
    console.error('boot failed', e);
    document.getElementById('view-home').innerHTML = '<div class="empty glass"><div class="empty-emoji">⚠️</div><h3>起動に失敗しました</h3><p>ブラウザのプライベートモードやストレージ制限の可能性があります。</p></div>';
  }
});

/* hash navigation */
window.addEventListener('hashchange', () => {
  const v = location.hash.replace('#', '');
  if (App.VIEWS.includes(v) && v !== App.current()) App.navigate(v);
});
