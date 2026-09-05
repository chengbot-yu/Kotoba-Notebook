/* demo data seeder — used only for screenshots (real user data is untouched) */
(async () => {
  await Store.clearAll();
  const base = [
    ['食べる', 'たべる', '動詞', '吃', '他動詞', ['JLPT N4', '生活']],
    ['行く', 'いく', '動詞', '去', '自動詞', ['JLPT N5', '生活']],
    ['綺麗', 'きれい', '形容動詞', '漂亮', '', ['JLPT N4']],
    ['図書館', 'としょかん', '名詞', '图书馆', '', ['JLPT N4', '場所']],
    ['勉強', 'べんきょう', '名詞', '学习', '', ['JLPT N5', '学校']],
    ['速い', 'はやい', '形容詞', '快', '', ['JLPT N4']],
    ['買う', 'かう', '動詞', '买', '他動詞', ['JLPT N5', '生活']],
    ['駅', 'えき', '名詞', '车站', '', ['JLPT N5', '場所']],
    ['友達', 'ともだち', '名詞', '朋友', '', ['JLPT N5', '人間']],
    ['春', 'はる', '名詞', '春天', '', ['JLPT N4', '季節']],
    ['走る', 'はしる', '動詞', '跑', '自動詞', ['JLPT N4', '動作']],
    ['静か', 'しずか', '形容動詞', '安静', '', ['JLPT N4']],
  ];
  for (const [word, reading, pos, trans, tr, tags] of base) {
    await Store.addWord({ word, reading, partOfSpeech: pos, translation: trans, transitivity: tr, tags, note: '', example: '' });
  }
  // review history on a few words
  const words = Store.getWords();
  await Store.recordReview(words[0].id, 'forgotten', 'jp2cn');
  await Store.recordReview(words[0].id, 'remembered', 'jp2cn');
  await Store.recordReview(words[1].id, 'remembered', 'cn2jp');
  // backdate study days + a few words for a livelier calendar
  const days = [
    [12, 3, 4], [11, 2, 5], [10, 0, 6], [9, 1, 4], [8, 2, 7], [7, 1, 3],
    [6, 4, 5], [5, 3, 8], [4, 2, 2], [3, 0, 4], [2, 1, 3],
  ];
  for (const [ago, nw, rv] of days) {
    const k = Util.addDays(Util.todayKey(), -ago);
    await DB.put('studyDays', { date: k, newWords: nw, reviewCount: rv, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  // backdate a couple of words to earlier days (and fix today's studyDay to stay consistent)
  for (let i = 0; i < 4; i++) {
    const w = words[i + 2];
    w.createdAt = new Date(Date.now() - (i + 3) * 86400000).toISOString();
    await DB.put('words', w);
  }
  const todayRec = (await DB.get('studyDays', Util.todayKey())) || { date: Util.todayKey(), newWords: 0, reviewCount: 0 };
  todayRec.newWords = 8; // 12 added, 4 backdated away
  await DB.put('studyDays', todayRec);
  location.reload();
})();
