import { describe, it, expect } from 'vitest';
import { parseEventsJsonl, aggregateToDrafts } from '@/lib/import';
import { filterOutImported } from '@/lib/autologMaintenance';

const sample = [
  // Day 1 InsightLog feat/x (s1)
  '{"ts":"2026-05-18T10:00:00.000Z","type":"session_start","session_id":"s1","repo":"/work/insightlog","branch":"feat/x"}',
  '{"ts":"2026-05-18T10:05:00.000Z","type":"git_commit","session_id":"s1","repo":"/work/insightlog","branch":"feat/x","commit":"a1","subject":"feat: a1"}',
  '{"ts":"2026-05-18T10:30:00.000Z","type":"session_progress","session_id":"s1","repo":"/work/insightlog","branch":"feat/x","duration_ms":1800000}',
  // Day 1 other-repo feat/y (s2)
  '{"ts":"2026-05-18T11:00:00.000Z","type":"session_start","session_id":"s2","repo":"/work/other","branch":"feat/y"}',
  '{"ts":"2026-05-18T11:05:00.000Z","type":"git_commit","session_id":"s2","repo":"/work/other","branch":"feat/y","commit":"b1","subject":"docs: x"}',
  '{"ts":"2026-05-18T11:30:00.000Z","type":"session_progress","session_id":"s2","repo":"/work/other","branch":"feat/y","duration_ms":1800000}',
  // Day 2 InsightLog feat/x (s3)
  '{"ts":"2026-05-19T09:00:00.000Z","type":"session_start","session_id":"s3","repo":"/work/insightlog","branch":"feat/x"}',
  '{"ts":"2026-05-19T09:30:00.000Z","type":"git_commit","session_id":"s3","repo":"/work/insightlog","branch":"feat/x","commit":"a2","subject":"refactor: a2"}',
  '{"ts":"2026-05-19T10:00:00.000Z","type":"session_progress","session_id":"s3","repo":"/work/insightlog","branch":"feat/x","duration_ms":3600000}',
].join('\n');

describe('filterOutImported', () => {
  it('importedDraftKeys が空なら全件残る', () => {
    const events = parseEventsJsonl(sample);
    const result = filterOutImported(events, new Set());
    expect(result.kept).toEqual(events);
    expect(result.removedCount).toBe(0);
  });

  it('Day1 InsightLog の draft を取り込み済みにすると、その関連イベントだけが消える', () => {
    const events = parseEventsJsonl(sample);
    const drafts = aggregateToDrafts(events);
    const day1Insightlog = drafts.find(
      (d) => d.meta.repoName === 'insightlog' && d.meta.jstDate === '2026-05-18'
    )!;
    const result = filterOutImported(events, new Set([day1Insightlog.draftKey]));

    // s1 系の 3 イベントが消える
    expect(result.removedCount).toBe(3);
    expect(result.kept).toHaveLength(events.length - 3);

    // 残ったイベントに s1 のイベントが含まれない
    expect(result.kept.every((e) => e.session_id !== 's1')).toBe(true);
    // s2, s3 は残る
    expect(result.kept.some((e) => e.session_id === 's2')).toBe(true);
    expect(result.kept.some((e) => e.session_id === 's3')).toBe(true);
  });

  it('2 つの draft を同時指定するとそれぞれの関連イベントが全部消える', () => {
    const events = parseEventsJsonl(sample);
    const drafts = aggregateToDrafts(events);
    const day1Insightlog = drafts.find(
      (d) => d.meta.repoName === 'insightlog' && d.meta.jstDate === '2026-05-18'
    )!;
    const day2Insightlog = drafts.find(
      (d) => d.meta.repoName === 'insightlog' && d.meta.jstDate === '2026-05-19'
    )!;
    const result = filterOutImported(
      events,
      new Set([day1Insightlog.draftKey, day2Insightlog.draftKey])
    );

    // s1 + s3 系で 6 件
    expect(result.removedCount).toBe(6);
    // 残るのは s2 系 3 件のみ
    expect(result.kept).toHaveLength(3);
    expect(result.kept.every((e) => e.session_id === 's2')).toBe(true);
  });

  it('存在しない draftKey を指定しても残るイベントは変わらない', () => {
    const events = parseEventsJsonl(sample);
    const result = filterOutImported(events, new Set(['nonexistent-key']));
    expect(result.kept).toEqual(events);
    expect(result.removedCount).toBe(0);
  });

  it('aggregateOpts を渡せば取り込み時と同じグルーピングで判定される', () => {
    const events = parseEventsJsonl(sample);
    // groupBy: 'branch' で InsightLog 全体が 1 つの draft
    const draftsByBranch = aggregateToDrafts(events, { groupBy: 'branch' });
    const insightlog = draftsByBranch.find((d) => d.meta.repoName === 'insightlog')!;
    const result = filterOutImported(
      events,
      new Set([insightlog.draftKey]),
      { groupBy: 'branch' }
    );
    // s1 + s3 系で 6 件
    expect(result.removedCount).toBe(6);
  });
});
