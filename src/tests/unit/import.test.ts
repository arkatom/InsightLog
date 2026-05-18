import { describe, it, expect } from 'vitest';
import { parseEventsJsonl, aggregateToDrafts, repoNameOf, tsToJstDate } from '@/lib/import';

// テストデータ: 全 ts は ISO 8601 UTC。JST 換算で確認しやすい時刻を選んでいる。
// 注意: 2026-05-18T10:00Z = 2026-05-18 19:00 JST → JST 日付 2026-05-18
//       2026-05-19T09:00Z = 2026-05-19 18:00 JST → JST 日付 2026-05-19
const sampleJsonl = [
  // Day 1 (JST) - InsightLog feat/x: 2 sessions worth of commits
  '{"ts":"2026-05-18T10:00:00.000Z","type":"session_start","session_id":"s1","cwd":"/work/insightlog","repo":"/work/insightlog","repo_remote":"https://github.com/arkatom/InsightLog.git","branch":"feat/x"}',
  '{"ts":"2026-05-18T10:05:00.000Z","type":"git_commit","session_id":"s1","repo":"/work/insightlog","branch":"feat/x","commit":"a1","subject":"feat: add foo","files":3}',
  '{"ts":"2026-05-18T10:15:00.000Z","type":"git_commit","session_id":"s1","repo":"/work/insightlog","branch":"feat/x","commit":"a2","subject":"feat: add foo","files":1}',
  '{"ts":"2026-05-18T10:20:00.000Z","type":"git_commit","session_id":"s1","repo":"/work/insightlog","branch":"feat/x","commit":"a3","subject":"fix: typo","files":1}',
  '{"ts":"2026-05-18T10:30:00.000Z","type":"session_progress","session_id":"s1","repo":"/work/insightlog","branch":"feat/x","duration_ms":1800000,"cost_usd":0.5}',
  // Day 1 (JST) - other-repo feat/y
  '{"ts":"2026-05-18T11:00:00.000Z","type":"session_start","session_id":"s2","cwd":"/work/other","repo":"/work/other","branch":"feat/y"}',
  '{"ts":"2026-05-18T11:08:00.000Z","type":"git_commit","session_id":"s2","repo":"/work/other","branch":"feat/y","commit":"b1","subject":"docs: README update","files":2}',
  '{"ts":"2026-05-18T11:15:00.000Z","type":"session_progress","session_id":"s2","repo":"/work/other","branch":"feat/y","duration_ms":900000,"cost_usd":0.2}',
  // 壊れた行 (should be skipped silently)
  '{this is not json}',
  '',
  // 不明 type (should be skipped)
  '{"ts":"2026-05-18T12:00:00.000Z","type":"unknown_thing","session_id":"sX"}',
  // Day 2 (JST) - InsightLog feat/x: 翌日に同じブランチを継続
  '{"ts":"2026-05-19T09:00:00.000Z","type":"session_start","session_id":"s3","repo":"/work/insightlog","branch":"feat/x"}',
  '{"ts":"2026-05-19T09:30:00.000Z","type":"git_commit","session_id":"s3","repo":"/work/insightlog","branch":"feat/x","commit":"a4","subject":"refactor: extract helper","files":2}',
  '{"ts":"2026-05-19T09:45:00.000Z","type":"session_progress","session_id":"s3","repo":"/work/insightlog","branch":"feat/x","duration_ms":2700000,"cost_usd":0.3}',
  // セッションだけ開いて commit 無し（タスク化されない想定）
  '{"ts":"2026-05-19T13:00:00.000Z","type":"session_start","session_id":"s4","repo":"/work/insightlog","branch":"chore/nothing"}',
  '{"ts":"2026-05-19T13:05:00.000Z","type":"session_progress","session_id":"s4","repo":"/work/insightlog","branch":"chore/nothing","duration_ms":300000}',
].join('\n');

describe('parseEventsJsonl', () => {
  it('正常な行のみを取り込み、壊れた行と未知の type を捨てる', () => {
    const events = parseEventsJsonl(sampleJsonl);
    // session_start * 4 + git_commit * 5 + session_progress * 4 = 13
    expect(events).toHaveLength(13);
    expect(events.every((e) => 'ts' in e && 'type' in e && 'session_id' in e)).toBe(true);
  });

  it('空文字列なら空配列を返す', () => {
    expect(parseEventsJsonl('')).toEqual([]);
  });

  it('全行が壊れていても落ちない', () => {
    expect(parseEventsJsonl('not json\nstill not json')).toEqual([]);
  });
});

describe('repoNameOf', () => {
  it('絶対パスの basename を返す', () => {
    expect(repoNameOf('/work/insightlog')).toBe('insightlog');
    expect(repoNameOf('/home/user/projects/foo')).toBe('foo');
  });

  it('undefined を渡したら undefined', () => {
    expect(repoNameOf(undefined)).toBeUndefined();
  });
});

describe('tsToJstDate', () => {
  it('UTC を JST 日付 (UTC+9) に変換する', () => {
    expect(tsToJstDate('2026-05-18T10:00:00.000Z')).toBe('2026-05-18'); // 19:00 JST
    expect(tsToJstDate('2026-05-18T14:59:59.999Z')).toBe('2026-05-18'); // 23:59:59 JST 当日
    expect(tsToJstDate('2026-05-18T15:00:00.000Z')).toBe('2026-05-19'); // 00:00 JST 翌日
    expect(tsToJstDate('2026-05-18T00:00:00.000Z')).toBe('2026-05-18'); // 09:00 JST 当日
  });

  it('UTC 当日早朝 (JST 同日明け方) は JST も同日', () => {
    expect(tsToJstDate('2026-05-18T00:01:00.000Z')).toBe('2026-05-18'); // 09:01 JST
  });

  it('パース不能なら空文字', () => {
    expect(tsToJstDate('not-a-date')).toBe('');
  });
});

describe('aggregateToDrafts — デフォルト (groupBy: branch-day, JST)', () => {
  it('JST 日付ごとに分割される: 同じ feat/x が Day1 と Day2 で別下書きになる', () => {
    const events = parseEventsJsonl(sampleJsonl);
    const drafts = aggregateToDrafts(events);
    // Day1: insightlog/feat/x, Day1: other/feat/y, Day2: insightlog/feat/x = 3 件
    expect(drafts).toHaveLength(3);

    const day1Insightlog = drafts.find(
      (d) => d.meta.repoName === 'insightlog' && d.meta.jstDate === '2026-05-18'
    );
    const day1Other = drafts.find((d) => d.meta.repoName === 'other');
    const day2Insightlog = drafts.find(
      (d) => d.meta.repoName === 'insightlog' && d.meta.jstDate === '2026-05-19'
    );
    expect(day1Insightlog).toBeDefined();
    expect(day1Other).toBeDefined();
    expect(day2Insightlog).toBeDefined();
  });

  it('Day1 insightlog: s1 のみで duration 30 分', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl));
    const d = drafts.find(
      (x) => x.meta.repoName === 'insightlog' && x.meta.jstDate === '2026-05-18'
    )!;
    expect(d.duration).toBe(30);
    expect(d.meta.sessionIds).toEqual(['s1']);
    expect(d.meta.commitCount).toBe(3); // a1, a2, a3
  });

  it('Day2 insightlog: s3 のみで duration 45 分・1 コミット', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl));
    const d = drafts.find(
      (x) => x.meta.repoName === 'insightlog' && x.meta.jstDate === '2026-05-19'
    )!;
    expect(d.duration).toBe(45);
    expect(d.meta.sessionIds).toEqual(['s3']);
    expect(d.meta.commitCount).toBe(1);
    expect(d.name).toBe('refactor: extract helper');
  });

  it('Day1 insightlog: subject dedupe (a1, a2 は同じ subject)', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl));
    const d = drafts.find(
      (x) => x.meta.repoName === 'insightlog' && x.meta.jstDate === '2026-05-18'
    )!;
    expect(d.notes).toContain('- feat: add foo');
    expect(d.notes).toContain('- fix: typo');
    expect(d.notes).not.toContain('- refactor: extract helper'); // それは Day2
  });

  it('日付昇順で並ぶ', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl));
    expect(drafts[0].meta.firstTs <= drafts[1].meta.firstTs).toBe(true);
    expect(drafts[1].meta.firstTs <= drafts[2].meta.firstTs).toBe(true);
  });

  it('カテゴリ推測は各バケット内のみで判定', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl));
    const day1 = drafts.find(
      (x) => x.meta.repoName === 'insightlog' && x.meta.jstDate === '2026-05-18'
    )!;
    const day2 = drafts.find(
      (x) => x.meta.repoName === 'insightlog' && x.meta.jstDate === '2026-05-19'
    )!;
    expect(day1.category).toEqual(expect.arrayContaining(['機能開発', 'バグ修正']));
    expect(day1.category).not.toContain('リファクタ');
    expect(day2.category).toEqual(['リファクタ']);
  });

  it('期間フィルタ since/until は JST 解釈', () => {
    const events = parseEventsJsonl(sampleJsonl);
    const dayOne = aggregateToDrafts(events, { since: '2026-05-18', until: '2026-05-18' });
    // JST 2026-05-18 のイベントだけ → insightlog/feat/x + other/feat/y = 2 件
    expect(dayOne).toHaveLength(2);
    expect(dayOne.every((d) => d.meta.jstDate === '2026-05-18')).toBe(true);
  });

  it('repoFilter で repo を絞れる', () => {
    const events = parseEventsJsonl(sampleJsonl);
    const onlyOther = aggregateToDrafts(events, { repoFilter: ['/work/other'] });
    expect(onlyOther).toHaveLength(1);
    expect(onlyOther[0].meta.repoName).toBe('other');
  });

  it('commit が 0 件のバケット (chore/nothing) は除外される', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl));
    expect(drafts.find((d) => d.meta.branch === 'chore/nothing')).toBeUndefined();
  });

  it('空のイベント配列なら空の下書き配列', () => {
    expect(aggregateToDrafts([])).toEqual([]);
  });

  it('draftKey は repo + branch + jstDate + firstTs で決定論的', () => {
    const events = parseEventsJsonl(sampleJsonl);
    const a = aggregateToDrafts(events);
    const b = aggregateToDrafts(events);
    // 同じ入力なら draftKey も同じ（取り込み済み判定に使えるための前提）
    expect(a.map((d) => d.draftKey)).toEqual(b.map((d) => d.draftKey));
    // 各 draftKey は jstDate を含む
    expect(a.every((d) => d.draftKey.includes(d.meta.jstDate ?? ''))).toBe(true);
  });
});

describe('aggregateToDrafts — groupBy: branch (日付を無視)', () => {
  it('複数日に跨ぐ同一ブランチ作業を 1 つにまとめる', () => {
    const events = parseEventsJsonl(sampleJsonl);
    const drafts = aggregateToDrafts(events, { groupBy: 'branch' });
    // insightlog/feat/x + other/feat/y = 2 件 (chore/nothing は除外)
    expect(drafts).toHaveLength(2);

    const insightlog = drafts.find((d) => d.meta.repoName === 'insightlog')!;
    // 30min + 45min = 75min が合算
    expect(insightlog.duration).toBe(75);
    expect(insightlog.meta.sessionIds.sort()).toEqual(['s1', 's3']);
    expect(insightlog.meta.commitCount).toBe(4);
    expect(insightlog.meta.jstDate).toBeUndefined();
  });

  it('cost_usd を合算してメタに含める', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl), { groupBy: 'branch' });
    const insightlog = drafts.find((d) => d.meta.repoName === 'insightlog')!;
    // s1: 0.5 + s3: 0.3 = 0.8
    expect(insightlog.meta.costUsd).toBeCloseTo(0.8, 5);
  });
});

describe('aggregateToDrafts — duration fallback', () => {
  it('全 session_progress に duration_ms が無い時、firstTs〜lastTs の経過時間で代用する', () => {
    // hook 入力に duration が含まれない実環境の挙動を模擬: progress イベントの duration_ms 抜き
    const lines = [
      '{"ts":"2026-05-18T10:00:00.000Z","type":"session_start","session_id":"sX","repo":"/work/x","branch":"main"}',
      '{"ts":"2026-05-18T10:30:00.000Z","type":"git_commit","session_id":"sX","repo":"/work/x","branch":"main","commit":"c1","subject":"feat: x"}',
      '{"ts":"2026-05-18T12:00:00.000Z","type":"session_progress","session_id":"sX","repo":"/work/x","branch":"main"}', // duration_ms 無し
    ].join('\n');
    const drafts = aggregateToDrafts(parseEventsJsonl(lines));
    expect(drafts).toHaveLength(1);
    // firstTs=10:00, lastTs=12:00 → 120分
    expect(drafts[0].duration).toBe(120);
  });

  it('一部のセッションだけ duration_ms があるなら fallback せず合算', () => {
    const lines = [
      '{"ts":"2026-05-18T10:00:00.000Z","type":"git_commit","session_id":"sA","repo":"/work/x","branch":"main","commit":"c1","subject":"feat"}',
      '{"ts":"2026-05-18T11:00:00.000Z","type":"session_progress","session_id":"sA","repo":"/work/x","branch":"main","duration_ms":600000}', // 10min
    ].join('\n');
    const drafts = aggregateToDrafts(parseEventsJsonl(lines));
    // hasDuration が true なので fallback は使わない: 600000ms = 10min
    expect(drafts[0].duration).toBe(10);
  });
});

describe('aggregateToDrafts — gapHours オプション', () => {
  it('gap = 0.5h なら Day1 insightlog 内の 10:30→ なし、Day2 09:00→9:45 は同一バケット内', () => {
    // gapHours 適用は同一バケット内（branch-day）でも更に分割される
    // Day1 s1 のイベントは 10:00 から 10:30 まで連続（gap < 30min）→ 1 タスク
    // Day1 と Day2 はそもそも別 jstDate なので別バケット
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl), { gapHours: 0.5 });
    expect(drafts.find((d) => d.meta.repoName === 'insightlog' && d.meta.jstDate === '2026-05-18'))
      .toBeDefined();
  });

  it('branch グルーピングと gapHours 併用で日跨ぎ作業も時間で分割', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl), {
      groupBy: 'branch',
      gapHours: 6,
    });
    // insightlog/feat/x: s1 (Day1 10:00-10:30) ⟶ 23h ⟶ s3 (Day2 09:00-09:45)
    // gap=6h → 分割される
    const splits = drafts.filter((d) => d.meta.repoName === 'insightlog');
    expect(splits).toHaveLength(2);
    expect(splits[0].duration).toBe(30);
    expect(splits[1].duration).toBe(45);
  });

  it('gapHours が十分大きければ分割しない', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl), {
      groupBy: 'branch',
      gapHours: 100,
    });
    const insightlog = drafts.find((d) => d.meta.repoName === 'insightlog')!;
    expect(insightlog.duration).toBe(75); // 合算されたまま
  });
});
