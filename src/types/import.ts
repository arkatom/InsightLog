// Claude Code hooks の autolog 出力を取り込むときに使う型

import type { Task } from './task';

/**
 * events.jsonl の 1 行。type ごとにフィールドが違うので Union 型で表現。
 * hooks 側で省略されるフィールドは optional。
 */
export type AutologEvent =
  | SessionStartEvent
  | SessionProgressEvent
  | SessionEndEvent
  | GitCommitEvent
  | GitPushEvent
  | GitCheckoutEvent;

interface AutologEventBase {
  ts: string;          // ISO 8601 UTC
  session_id: string;
  cwd?: string;
  repo?: string;       // git toplevel
  repo_remote?: string;
  branch?: string;
}

export interface SessionStartEvent extends AutologEventBase {
  type: 'session_start';
  head_sha?: string;
  source?: 'startup' | 'resume' | 'clear' | 'compact' | string;
}

export interface SessionProgressEvent extends AutologEventBase {
  type: 'session_progress';
  duration_ms?: number;
  /** assistant メッセージ数（≒ ターン数） */
  turn_count?: number;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  /** 旧スキーマ互換用（現在は出力しない） */
  cost_usd?: number;
  lines_added?: number;
  lines_removed?: number;
}

export interface SessionEndEvent extends AutologEventBase {
  type: 'session_end';
  end_reason?: string;
  duration_ms?: number;
  turn_count?: number;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  /** 旧スキーマ互換（hooks では現状出力しないが、外部ツールが渡してくる可能性に備える） */
  cost_usd?: number;
}

export interface GitCommitEvent extends AutologEventBase {
  type: 'git_commit';
  commit?: string;
  subject?: string;
  files?: number;
}

export interface GitPushEvent extends AutologEventBase {
  type: 'git_push';
  command?: string;
}

export interface GitCheckoutEvent extends AutologEventBase {
  type: 'git_checkout';
  to_branch?: string;
  from_branch?: string;
  command?: string;
}

/**
 * インポート時に TaskForm へ渡す下書き。
 * - `name` / `duration` などは events から推定済み
 * - `aiToolsUsed` / `timeMinutesNoAi` はユーザー入力で埋める前提（draft mode の必須）
 * - `category` は推定値があれば候補として渡す（空でも可）
 */
export type DraftTask = Pick<
  Task,
  'name' | 'taskUrl' | 'duration' | 'reworkCount' | 'category' | 'notes'
> & {
  /** 下書きを一意に識別するキー。インポート画面内の選択管理用 & 取り込み済み判定に使う。 */
  draftKey: string;
  /** インポート由来のメタ情報（UI 表示用、Task には保存しない） */
  meta: {
    repo?: string;
    repoName?: string;
    branch?: string;
    /** JST 日付（YYYY-MM-DD）。groupBy: 'branch-day' の時に入る */
    jstDate?: string;
    sessionIds: string[];
    commitCount: number;
    firstTs: string;
    lastTs: string;
    /** 旧スキーマ互換: hooks 側で計算していた累計コスト */
    costUsd?: number;
    /** transcript ベースで集計したセッション総ターン数 */
    turnCount?: number;
    /** 累計トークン使用量 */
    inputTokens?: number;
    outputTokens?: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
};

export interface AggregateOptions {
  /** 日付範囲フィルタ（YYYY-MM-DD, JST 解釈）。未指定なら全件。 */
  since?: string;
  until?: string;
  /** repo を絞り込む。指定すると一致しないイベントは除外。 */
  repoFilter?: string[];
  /**
   * グルーピング方針。
   * - `'branch-day'` (デフォルト): repo × branch × JST 日付ごとに 1 下書き。1日1回まとめる運用と相性が良い
   * - `'branch'`: repo × branch だけでまとめる。複数日に跨ぐ連続作業を1つにしたい時
   */
  groupBy?: 'branch' | 'branch-day';
  /**
   * 同一バケット内で連続するイベント間のギャップが gapHours を超えたら別の下書きに分割する。
   * 指定なしなら分割しない。例: 3 で「3 時間以上空いたら別タスク」
   */
  gapHours?: number;
}
