// Claude Code hooks の autolog 出力を取り込むときに使う型

import type { Task } from './task';

/**
 * events.jsonl の 1 行。type ごとにフィールドが違うので Union 型で表現。
 * hooks 側で省略されるフィールドは optional。
 */
export type AutologEvent =
  | SessionStartEvent
  | SessionProgressEvent
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
  cost_usd?: number;
  lines_added?: number;
  lines_removed?: number;
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
  /** 下書きを一意に識別するキー。インポート画面内の選択管理用。 */
  draftKey: string;
  /** インポート由来のメタ情報（UI 表示用、Task には保存しない） */
  meta: {
    repo?: string;
    repoName?: string;
    branch?: string;
    sessionIds: string[];
    commitCount: number;
    firstTs: string;
    lastTs: string;
    costUsd?: number;
  };
};

export interface AggregateOptions {
  /** 日付範囲フィルタ（ISO 8601 文字列、UTC）。未指定なら全件。 */
  since?: string;
  until?: string;
  /** repo を絞り込む。指定すると一致しないイベントは除外。 */
  repoFilter?: string[];
}
