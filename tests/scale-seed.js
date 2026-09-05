/* ことばノート — scale test phase 1: seed N words + 60 studyDays into the
   v2 IndexedDB (same record shape as src/lib/store.ts). Run via ev-run with
   scale-verify.js as the second eval file (driver reloads between phases).
   N comes from the URL (?n=10 / ?n=100), defaulting to 500. */
const N = Math.max(1, Math.min(500, Number(new URLSearchParams(location.search).get('n')) || 500));
const pad = n => String(n).padStart(2, '0');
const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = key(new Date());
const addDays = (k, n) => { const [y, m, d] = k.split('-').map(Number); const dt = new Date(y, m - 1, d + n); return key(dt); };

const STEMS = [
  ['食', 'た'], ['見', 'み'], ['行', 'い'], ['来', 'く'], ['読', 'よ'], ['書', 'か'], ['話', 'はな'], ['聞', 'き'],
  ['買', 'か'], ['売', 'う'], ['飲', 'の'], ['走', 'はし'], ['待', 'ま'], ['使', 'つか'], ['作', 'つく'], ['思', 'おも'],
  ['考', 'かんが'], ['始', 'はじ'], ['終', 'お'], ['休', 'やす'], ['入', 'はい'], ['出', 'で'], ['立', 'た'], ['住', 'す'],
  ['教', 'おし'], ['習', 'なら'], ['動', 'うご'], ['手', 'て'], ['電', 'でん'], ['車', 'くるま'], ['水', 'みず'], ['火', 'ひ'],
  ['木', 'き'], ['金', 'かね'], ['土', 'つち'], ['花', 'はな'], ['鳥', 'とり'], ['魚', 'さかな'], ['山', 'やま'], ['川', 'かわ'],
  ['空', 'そら'], ['海', 'うみ'], ['校', 'こう'], ['社', 'しゃ'], ['駅', 'えき'], ['店', 'みせ'], ['家', 'いえ'], ['友', 'とも'],
  ['犬', 'いぬ'], ['猫', 'ねこ'],
];
const ENDINGS = ['る', 'ける', 'める', 'ねる', 'べる', 'む', 'ぐ', 'す', 'つ', 'ぶ'];
const POS = ['動詞', '名詞', '形容詞', '副詞'];
const TAGS = [['JLPT N3', '生活'], ['JLPT N2'], ['仕事'], ['JLPT N3'], []];

function makeWord(i) {
  const [stemK, stemR] = STEMS[i % STEMS.length];
  const end = ENDINGS[(i / STEMS.length | 0) % ENDINGS.length];
  const word = stemK + end;
  const reading = stemR + end;
  const pos = POS[i % POS.length];
  const reviewCount = i % 3;
  const forgotCount = reviewCount === 2 ? 1 : 0;
  const rememberedCount = reviewCount - forgotCount;
  const streak = forgotCount ? 0 : reviewCount;
  const due = i % 5 < 2; // 40% due
  const created = new Date(Date.now() - i * (90 / N) * 86400000);
  const mastery = reviewCount === 0 ? 'new' : streak >= 3 ? 'familiar' : 'learning';
  return {
    id: `w_scale_${i}`,
    word, reading,
    partOfSpeech: pos,
    translation: `译${i + 1}`,
    transitivity: pos === '動詞' ? (i % 2 ? '他動詞' : '自動詞') : '',
    example: `${word}。これは${i + 1}番目の例文です。`,
    note: i % 5 === 0 ? '覚え書き' : '',
    tags: TAGS[i % TAGS.length],
    important: i % 7 === 0,
    hard: i % 11 === 0,
    createdAt: created.toISOString(),
    updatedAt: created.toISOString(),
    lastReviewedAt: reviewCount ? created.toISOString() : null,
    reviewCount, forgotCount, rememberedCount, streak,
    nextReviewAt: reviewCount === 0 ? null : (due ? addDays(today, -1) : addDays(today, [1, 3, 7, 14][i % 4])),
    mastery,
  };
}

function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('kotoba-notebook');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function putAll(storeName, items) {
  const db = await openDb();
  await new Promise((res, rej) => {
    const tx = db.transaction(storeName, 'readwrite');
    const os = tx.objectStore(storeName);
    items.forEach(it => os.put(it));
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}
async function clearStores() {
  const db = await openDb();
  for (const s of ['words', 'reviews', 'studyDays', 'achievements']) {
    await new Promise((res, rej) => {
      const tx = db.transaction(s, 'readwrite');
      tx.objectStore(s).clear();
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  }
}

await clearStores();
const words = Array.from({ length: N }, (_, i) => makeWord(i));
const days = [];
for (let i = 59; i >= 0; i--) {
  const d = addDays(today, -i);
  days.push({ date: d, newWords: 3 + (i % 5), reviewCount: 2 + (i % 8), createdAt: new Date().toISOString() });
}
const nowIso = new Date().toISOString();
const achv = [
  { id: 'first-word', unlockedAt: nowIso },
  { id: 'words-10', unlockedAt: nowIso },
  { id: 'words-100', unlockedAt: nowIso },
];
const t0 = performance.now();
await putAll('words', words);
await putAll('studyDays', days);
await putAll('achievements', achv);
const seedMs = Math.round(performance.now() - t0);
setResult(`SEEDED ${words.length} words + ${days.length} studyDays + ${achv.length} achievements in ${seedMs}ms`);
