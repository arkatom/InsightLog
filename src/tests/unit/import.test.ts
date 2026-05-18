import { describe, it, expect } from 'vitest';
import { parseEventsJsonl, aggregateToDrafts, repoNameOf } from '@/lib/import';

const sampleJsonl = [
  // Day 1 - InsightLog feat/x: 2 commits, 1 session, 30min, $0.5
  '{"ts":"2026-05-18T10:00:00.000Z","type":"session_start","session_id":"s1","cwd":"/work/insightlog","repo":"/work/insightlog","repo_remote":"https://github.com/arkatom/InsightLog.git","branch":"feat/x"}',
  '{"ts":"2026-05-18T10:05:00.000Z","type":"git_commit","session_id":"s1","repo":"/work/insightlog","branch":"feat/x","commit":"a1","subject":"feat: add foo","files":3}',
  '{"ts":"2026-05-18T10:15:00.000Z","type":"git_commit","session_id":"s1","repo":"/work/insightlog","branch":"feat/x","commit":"a2","subject":"feat: add foo","files":1}',
  '{"ts":"2026-05-18T10:20:00.000Z","type":"git_commit","session_id":"s1","repo":"/work/insightlog","branch":"feat/x","commit":"a3","subject":"fix: typo","files":1}',
  '{"ts":"2026-05-18T10:30:00.000Z","type":"session_progress","session_id":"s1","repo":"/work/insightlog","branch":"feat/x","duration_ms":1800000,"cost_usd":0.5}',
  // Day 1 - other-repo feat/y: 1 commit, 1 session, 15min
  '{"ts":"2026-05-18T11:00:00.000Z","type":"session_start","session_id":"s2","cwd":"/work/other","repo":"/work/other","branch":"feat/y"}',
  '{"ts":"2026-05-18T11:08:00.000Z","type":"git_commit","session_id":"s2","repo":"/work/other","branch":"feat/y","commit":"b1","subject":"docs: README update","files":2}',
  '{"ts":"2026-05-18T11:15:00.000Z","type":"session_progress","session_id":"s2","repo":"/work/other","branch":"feat/y","duration_ms":900000,"cost_usd":0.2}',
  // 壊れた行 (should be skipped silently)
  '{this is not json}',
  '',
  // 不明 type (should be skipped)
  '{"ts":"2026-05-18T12:00:00.000Z","type":"unknown_thing","session_id":"sX"}',
  // Day 2 - InsightLog feat/x: 1 commit (continuing the same branch)
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
    // 期待: session_start * 4 + git_commit * 5 + session_progress * 4 = 13
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

describe('aggregateToDrafts', () => {
  it('repo × branch で 2 つの下書きを生成する（commit のないバケットは除外）', () => {
    const events = parseEventsJsonl(sampleJsonl);
    const drafts = aggregateToDrafts(events);
    expect(drafts).toHaveLength(2);

    const insightlog = drafts.find((d) => d.meta.repoName === 'insightlog');
    const other = drafts.find((d) => d.meta.repoName === 'other');
    expect(insightlog).toBeDefined();
    expect(other).toBeDefined();
  });

  it('日付昇順で並ぶ', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl));
    expect(drafts[0].meta.firstTs <= drafts[1].meta.firstTs).toBe(true);
  });

  it('セッション最終 session_progress の duration を合算する（重複コミット subject は dedupe）', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl));
    const insightlog = drafts.find((d) => d.meta.repoName === 'insightlog')!;
    // s1: 1800000ms (30min) + s3: 2700000ms (45min) = 4500000ms (75min)
    expect(insightlog.duration).toBe(75);
    // commit a1 と a2 は同じ subject "feat: add foo" → 1回だけ。a3=fix, a4=refactor とで合計 3 unique
    expect(insightlog.notes).toContain('- feat: add foo');
    expect(insightlog.notes).toContain('- fix: typo');
    expect(insightlog.notes).toContain('- refactor: extract helper');
    // 合計 4 commits（dedupe 前）
    expect(insightlog.meta.commitCount).toBe(4);
  });

  it('name はユニーク化された最初の subject', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl));
    const insightlog = drafts.find((d) => d.meta.repoName === 'insightlog')!;
    expect(insightlog.name).toBe('feat: add foo');
  });

  it('conventional commits プレフィックスからカテゴリを推測', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl));
    const insightlog = drafts.find((d) => d.meta.repoName === 'insightlog')!;
    // feat: + fix: + refactor: が含まれる
    expect(insightlog.category).toEqual(
      expect.arrayContaining(['機能開発', 'バグ修正', 'リファクタ'])
    );
  });

  it('cost_usd を合算してメタに含める', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl));
    const insightlog = drafts.find((d) => d.meta.repoName === 'insightlog')!;
    // s1: 0.5 + s3: 0.3 = 0.8
    expect(insightlog.meta.costUsd).toBeCloseTo(0.8, 5);
  });

  it('期間フィルタ since/until で範囲を絞れる', () => {
    const events = parseEventsJsonl(sampleJsonl);
    const dayOne = aggregateToDrafts(events, { since: '2026-05-18', until: '2026-05-18' });
    // Day 1 だけだと insightlog/feat/x にも other-repo/feat/y にも commit がある
    expect(dayOne).toHaveLength(2);
    const insightlog = dayOne.find((d) => d.meta.repoName === 'insightlog')!;
    // s3 を含まないので duration は s1 のみ = 30分
    expect(insightlog.duration).toBe(30);
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

  it('セッション数とコミット数のメタが正しい', () => {
    const drafts = aggregateToDrafts(parseEventsJsonl(sampleJsonl));
    const insightlog = drafts.find((d) => d.meta.repoName === 'insightlog')!;
    expect(insightlog.meta.sessionIds.sort()).toEqual(['s1', 's3']);
    expect(insightlog.meta.commitCount).toBe(4);
  });
});
