/* Seed demo data for screenshots (evaluated inside the page by shot.mjs).
   28 words across the past 40 days + 40 studyDays + 4 achievements. */
(async () => {
  const pad = n => String(n).padStart(2, '0');
  const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = key(new Date());
  const addDays = (k, n) => { const [y, m, d] = k.split('-').map(Number); const dt = new Date(y, m - 1, d + n); return key(dt); };
  const openDb = () => new Promise((res, rej) => { const r = indexedDB.open('kotoba-notebook'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const putAll = async (name, items) => {
    const db = await openDb();
    await new Promise((res, rej) => {
      const tx = db.transaction(name, 'readwrite');
      items.forEach(it => tx.objectStore(name).put(it));
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  };
  const WORDS = [
    ['食べる', 'たべる', '吃', '動詞', '他動詞', '朝ご飯を食べる。', ['JLPT N3', '生活'], true, false],
    ['見る', 'みる', '看', '動詞', '他動詞', '映画を見る。', ['JLPT N5'], false, false],
    ['勉強', 'べんきょう', '学习', '名詞', '', '日本語を勉強します。', ['JLPT N5', '学校'], false, false],
    ['美しい', 'うつくしい', '美丽', '形容詞', '', '美しい景色だった。', ['JLPT N4'], false, true],
    ['約束', 'やくそく', '约定', '名詞', '', '彼と約束した。', ['JLPT N3'], true, false],
    ['曖昧', 'あいまい', '模糊', '形容詞', '', '曖昧な返事。', ['JLPT N2'], false, true],
    ['出発', 'しゅっぱつ', '出发', '名詞', '', '明日出発する。', ['JLPT N3', '旅行'], false, false],
    ['手伝う', 'てつだう', '帮忙', '動詞', '他動詞', '荷物を手伝って。', ['JLPT N4'], false, false],
    ['静か', 'しずか', '安静', '形容詞', '', '静かな図書館。', ['JLPT N5'], false, false],
    ['散歩', 'さんぽ', '散步', '名詞', '', '公園を散歩する。', ['生活'], false, false],
    ['急ぐ', 'いそぐ', '赶时间', '動詞', '自動詞', '急いでください。', ['JLPT N4'], false, false],
    ['迷う', 'まよう', '迷路', '動詞', '自動詞', '道に迷った。', ['JLPT N4', '旅行'], false, true],
    ['恋愛', 'れんあい', '恋爱', '名詞', '', '恋愛ドラマ。', [], false, false],
    ['確かめる', 'たしかめる', '确认', '動詞', '他動詞', '時刻を確かめる。', ['JLPT N2'], true, false],
    ['環境', 'かんきょう', '环境', '名詞', '', '環境問題。', ['JLPT N2'], false, false],
    ['驚く', 'おどろく', '惊讶', '動詞', '自動詞', '彼の話に驚いた。', ['JLPT N3'], false, false],
    ['載せる', 'のせる', '刊登/装载', '動詞', '他動詞', 'ネットに載せる。', ['JLPT N2'], false, true],
    ['面倒', 'めんどう', '麻烦', '名詞', '', '面倒な作業。', ['JLPT N2'], false, false],
    ['諦める', 'あきらめる', '放弃', '動詞', '他動詞', '夢を諦めない。', ['JLPT N2'], true, true],
    ['湿度', 'しつど', '湿度', '名詞', '', '湿度が高い。', ['生活'], false, false],
    ['贅沢', 'ぜいたく', '奢侈', '形容詞', '', '贅沢な旅行。', ['JLPT N1'], false, false],
    ['抱える', 'かかえる', '承担/抱', '動詞', '他動詞', '問題を抱える。', ['JLPT N1'], false, true],
    ['機会', 'きかい', '机会', '名詞', '', 'またの機会に。', ['JLPT N2'], false, false],
    ['柔らかい', 'やわらかい', '柔软', '形容詞', '', '柔らかいパン。', ['JLPT N3'], false, false],
    ['遠慮', 'えんりょ', '客气/顾虑', '名詞', '', '遠慮しないで。', ['JLPT N2'], false, false],
    ['賑やか', 'にぎやか', '热闹', '形容詞', '', '賑やかな商店街。', ['JLPT N5'], false, false],
    ['枯れる', 'かれる', '枯萎', '動詞', '自動詞', '花が枯れた。', [], false, false],
    ['励ます', 'はげます', '鼓励', '動詞', '他動詞', '友達を励ます。', ['JLPT N1'], true, false],
  ];
  const words = WORDS.map(([word, reading, translation, pos, trans, ex, tags, imp, hard], i) => {
    const created = new Date(Date.now() - (i % 40) * 86400000 - (i % 7) * 3600000);
    const rc = i % 4 === 0 ? 0 : (i % 4) + 1;
    const forgot = i % 6 === 5 ? 1 : 0;
    return {
      id: `w_shot_${i}`, word, reading, partOfSpeech: pos, translation, transitivity: trans,
      example: ex, note: imp ? '重点单词' : '', tags, important: !!imp, hard: !!hard,
      createdAt: created.toISOString(), updatedAt: created.toISOString(),
      lastReviewedAt: rc ? created.toISOString() : null,
      reviewCount: rc, forgotCount: forgot, rememberedCount: rc - forgot, streak: rc - forgot,
      nextReviewAt: rc === 0 ? null : (i % 3 === 0 ? addDays(today, -1) : addDays(today, (i % 4) + 1)),
      mastery: rc === 0 ? 'new' : (rc - forgot) >= 3 ? 'familiar' : 'learning',
    };
  });
  const days = [];
  for (let i = 39; i >= 0; i--) {
    days.push({ date: addDays(today, -i), newWords: (i % 4 === 0) ? 1 + (i % 3) : 0, reviewCount: 2 + (i % 7), createdAt: new Date().toISOString() });
  }
  const now = new Date().toISOString();
  const achv = ['first-word', 'words-10', 'review-1', 'streak-3'].map(id => ({ id, unlockedAt: now }));
  await putAll('words', words);
  await putAll('studyDays', days);
  await putAll('achievements', achv);
  return `SEEDED ${words.length} words`;
})()
