// events.jsonl の物理メンテナンス。
// File System Access API で取った handle を使い、取り込み済み draftKey に紐づく
// events を削除する。race-safe（書き戻し直前に concurrent append 部分を取り直す）。

import { parseEventsJsonl, eventsByDraftKey } from './import';
import { readHandleAsText, writeHandleText, ensureWritePermission } from './fsAccess';
import type { AggregateOptions, AutologEvent } from '@/types/import';

/**
 * importedDraftKeys に紐づくイベントを除外したリストを返す（純粋関数）。
 * 取り込み済みかどうかの判定は eventsByDraftKey 経由で行う。
 */
export function filterOutImported(
  events: AutologEvent[],
  importedDraftKeys: Set<string>,
  aggregateOpts: AggregateOptions = {}
): { kept: AutologEvent[]; removedCount: number } {
  if (importedDraftKeys.size === 0) {
    return { kept: events.slice(), removedCount: 0 };
  }
  const map = eventsByDraftKey(events, aggregateOpts);
  const kept = events.filter((e) => {
    const k = map.get(e);
    return !k || !importedDraftKeys.has(k);
  });
  return { kept, removedCount: events.length - kept.length };
}

export interface PurgeResult {
  removedCount: number;
  preservedCount: number;
  appendedDuringPurge: number;
}

export interface PurgeOptions {
  /** aggregateToDrafts と同じグルーピング設定（取り込み時の opts と合わせる必要がある） */
  aggregateOpts?: AggregateOptions;
}

/**
 * events.jsonl から取り込み済み draftKey に紐づくイベントを物理削除する。
 *
 * 流れ:
 *   1. ファイル全体を読む (snapshot A)
 *   2. snapshot A 中で削除対象を判定、残すべきイベントを集める
 *   3. もう一度読む (snapshot B)。snapshot A 以降に追記された部分を抽出
 *   4. 残すべきイベント + 追記部分を書き戻す
 *
 * これで読込〜書込の間に hooks が追記したイベントを失わない。
 * snapshot B 取得後〜書込開始までの間の追記はロスする可能性があるが、
 * ユーザー操作起点（取り込み完了時）でしか実行しないため実用上は許容範囲。
 */
export async function purgeImportedFromJsonl(
  handle: FileSystemFileHandle,
  importedDraftKeys: Set<string>,
  opts: PurgeOptions = {}
): Promise<PurgeResult> {
  if (importedDraftKeys.size === 0) {
    return { removedCount: 0, preservedCount: 0, appendedDuringPurge: 0 };
  }

  const ok = await ensureWritePermission(handle);
  if (!ok) throw new Error('write permission denied');

  // Snapshot A
  const textA = await readHandleAsText(handle);
  const eventsA = parseEventsJsonl(textA);
  if (eventsA.length === 0) {
    return { removedCount: 0, preservedCount: 0, appendedDuringPurge: 0 };
  }

  const { kept: filtered, removedCount } = filterOutImported(
    eventsA,
    importedDraftKeys,
    opts.aggregateOpts ?? {}
  );

  // Snapshot B - キャプチャ間に追記された生テキスト部分を保全
  const textB = await readHandleAsText(handle);
  const newPortion = textB.length > textA.length ? textB.slice(textA.length) : '';
  const appendedEvents = parseEventsJsonl(newPortion);

  const merged = [...filtered, ...appendedEvents];
  const out = merged.map((e) => JSON.stringify(e)).join('\n') + (merged.length > 0 ? '\n' : '');

  await writeHandleText(handle, out);

  return {
    removedCount,
    preservedCount: filtered.length,
    appendedDuringPurge: appendedEvents.length,
  };
}
