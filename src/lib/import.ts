// Claude Code hooks の autolog (events.jsonl) を InsightLog の下書きタスクへ変換する

import type {
  AutologEvent,
  SessionStartEvent,
  SessionProgressEvent,
  SessionEndEvent,
  GitCommitEvent,
  DraftTask,
  AggregateOptions,
} from '@/types/import';

/** session_progress / session_end どちらも累積メトリクスを持つので統一して扱う */
type SessionProgressLike = SessionProgressEvent | SessionEndEvent;

/**
 * events.jsonl のテキスト全体をパースする。空行・パース失敗行はスキップ。
 * 返り値は型ガード済みのイベント配列。
 */
export function parseEventsJsonl(text: string): AutologEvent[] {
  const out: AutologEvent[] = [];
  const lines = text.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      if (isAutologEvent(obj)) {
        out.push(obj);
      }
    } catch {
      // 1行壊れていても続行
    }
  }
  return out;
}

function isAutologEvent(obj: unknown): obj is AutologEvent {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.ts !== 'string') return false;
  if (typeof o.type !== 'string') return false;
  if (typeof o.session_id !== 'string') return false;
  return [
    'session_start',
    'session_progress',
    'session_end',
    'git_commit',
    'git_push',
    'git_checkout',
  ].includes(o.type);
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * ISO 8601 UTC 文字列 → JST(UTC+9) の YYYY-MM-DD。
 * パース不能なら空文字。
 */
export function tsToJstDate(ts: string): string {
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return '';
  return new Date(t + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * 期間フィルタ。since/until は JST 解釈の YYYY-MM-DD（両端含む）。
 */
function inRange(ts: string, since?: string, until?: string): boolean {
  if (!since && !until) return true;
  const date = tsToJstDate(ts);
  if (!date) return false;
  if (since && date < since) return false;
  if (until && date > until) return false;
  return true;
}

/**
 * リポ名（toplevel パスの basename）。表示用。
 */
export function repoNameOf(repo: string | undefined): string | undefined {
  if (!repo) return undefined;
  const parts = repo.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? repo;
}

/**
 * events から下書きタスクを生成する。
 *
 * グルーピング規則（デフォルト `groupBy: 'branch-day'`）:
 *   - 同じ (repo, branch, JST 日付) に属する全イベントを 1 タスク候補とする
 *   - repo か branch が無いイベントは "(unknown-repo)" / "(detached)" にフォールバック
 *   - duration_ms はセッションごとの最終 session_progress を合算
 *   - subject は時系列でユニーク化（同じメッセージの重複コミットは1回）
 *   - gapHours 指定時はバケット内を更にイベント間ギャップで分割
 *
 * グルーピング規則（`groupBy: 'branch'`）:
 *   - JST 日付を無視。複数日に跨いだ同一ブランチ作業を 1 つにまとめる
 */
export function aggregateToDrafts(
  events: AutologEvent[],
  opts: AggregateOptions = {}
): DraftTask[] {
  const groupBy = opts.groupBy ?? 'branch-day';

  const filtered = events.filter((e) => {
    if (!inRange(e.ts, opts.since, opts.until)) return false;
    if (opts.repoFilter && opts.repoFilter.length > 0) {
      if (!e.repo || !opts.repoFilter.includes(e.repo)) return false;
    }
    return true;
  });

  type Bucket = {
    repo?: string;
    branch?: string;
    jstDate?: string;
    sessionIds: Set<string>;
    commits: GitCommitEvent[];
    starts: SessionStartEvent[];
    progress: SessionProgressLike[];
    firstTs: string;
    lastTs: string;
  };

  const bucketKey = (e: AutologEvent): string => {
    const repoKey = e.repo ?? '(unknown-repo)';
    const branchKey = e.branch ?? '(detached)';
    if (groupBy === 'branch') return `${repoKey}::${branchKey}`;
    return `${repoKey}::${branchKey}::${tsToJstDate(e.ts)}`;
  };

  const buckets = new Map<string, Bucket>();

  for (const e of filtered) {
    const k = bucketKey(e);
    let b = buckets.get(k);
    if (!b) {
      b = {
        repo: e.repo,
        branch: e.branch,
        jstDate: groupBy === 'branch-day' ? tsToJstDate(e.ts) : undefined,
        sessionIds: new Set(),
        commits: [],
        starts: [],
        progress: [],
        firstTs: e.ts,
        lastTs: e.ts,
      };
      buckets.set(k, b);
    }
    b.sessionIds.add(e.session_id);
    if (e.ts < b.firstTs) b.firstTs = e.ts;
    if (e.ts > b.lastTs) b.lastTs = e.ts;
    switch (e.type) {
      case 'git_commit':
        b.commits.push(e);
        break;
      case 'session_start':
        b.starts.push(e);
        break;
      case 'session_progress':
      case 'session_end':
        // どちらも累積メトリクスを持つ。last-by-session で最新を採用する
        b.progress.push(e);
        break;
      // git_push / git_checkout は集計に直接寄与しない（境界候補のみ）
    }
  }

  // gapHours 指定時はバケット内をギャップで分割
  const effectiveBuckets: Bucket[] = [];
  for (const b of buckets.values()) {
    if (opts.gapHours && opts.gapHours > 0) {
      effectiveBuckets.push(...splitByGap(b, opts.gapHours));
    } else {
      effectiveBuckets.push(b);
    }
  }

  // commit が 0 件のバケットは「セッションは開いたが何もコミットしてない」状態。
  // タスク化する意味が薄いので除外。session のみ拾いたいユースケースが出たら緩める。
  const drafts: DraftTask[] = [];
  for (const b of effectiveBuckets) {
    if (b.commits.length === 0) continue;
    drafts.push(buildDraft(b));
  }

  // 開始時刻の昇順で並べる（古いものから順）
  drafts.sort((a, b) => a.meta.firstTs.localeCompare(b.meta.firstTs));
  return drafts;
}

type RawBucket = {
  repo?: string;
  branch?: string;
  jstDate?: string;
  sessionIds: Set<string>;
  commits: GitCommitEvent[];
  starts: SessionStartEvent[];
  progress: SessionProgressLike[];
  firstTs: string;
  lastTs: string;
};

/**
 * バケット内のイベントを時系列で並べ、gapHours を超える隙間で分割する。
 */
function splitByGap(b: RawBucket, gapHours: number): RawBucket[] {
  const gapMs = gapHours * 60 * 60 * 1000;
  // 全イベントを時系列ソート
  type AnyEvent =
    | { kind: 'commit'; e: GitCommitEvent }
    | { kind: 'start'; e: SessionStartEvent }
    | { kind: 'progress'; e: SessionProgressLike };
  const all: AnyEvent[] = [
    ...b.commits.map((e) => ({ kind: 'commit' as const, e })),
    ...b.starts.map((e) => ({ kind: 'start' as const, e })),
    ...b.progress.map((e) => ({ kind: 'progress' as const, e })),
  ];
  all.sort((x, y) => x.e.ts.localeCompare(y.e.ts));

  if (all.length === 0) return [b];

  const segments: RawBucket[] = [];
  let cur: RawBucket | null = null;
  let prevMs = 0;
  for (const x of all) {
    const ms = Date.parse(x.e.ts);
    if (!cur || ms - prevMs > gapMs) {
      cur = {
        repo: b.repo,
        branch: b.branch,
        jstDate: b.jstDate,
        sessionIds: new Set(),
        commits: [],
        starts: [],
        progress: [],
        firstTs: x.e.ts,
        lastTs: x.e.ts,
      };
      segments.push(cur);
    }
    cur.sessionIds.add(x.e.session_id);
    if (x.e.ts < cur.firstTs) cur.firstTs = x.e.ts;
    if (x.e.ts > cur.lastTs) cur.lastTs = x.e.ts;
    if (x.kind === 'commit') cur.commits.push(x.e);
    else if (x.kind === 'start') cur.starts.push(x.e);
    else cur.progress.push(x.e);
    prevMs = ms;
  }
  return segments;
}

function buildDraft(b: {
  repo?: string;
  branch?: string;
  jstDate?: string;
  sessionIds: Set<string>;
  commits: GitCommitEvent[];
  starts: SessionStartEvent[];
  progress: SessionProgressLike[];
  firstTs: string;
  lastTs: string;
}): DraftTask {
  // duration / トークン: セッション単位の最新 session_progress / session_end を合算
  const lastBySession = new Map<string, SessionProgressLike>();
  for (const p of b.progress) {
    const cur = lastBySession.get(p.session_id);
    if (!cur || p.ts > cur.ts) {
      lastBySession.set(p.session_id, p);
    }
  }
  let durationMs = 0;
  let costUsd = 0;
  let turnCount = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadInputTokens = 0;
  let cacheCreationInputTokens = 0;
  let hasDuration = false;
  for (const p of lastBySession.values()) {
    if (typeof p.duration_ms === 'number') {
      durationMs += p.duration_ms;
      hasDuration = true;
    }
    if (typeof p.cost_usd === 'number') costUsd += p.cost_usd;
    if (typeof p.turn_count === 'number') turnCount += p.turn_count;
    if (typeof p.input_tokens === 'number') inputTokens += p.input_tokens;
    if (typeof p.output_tokens === 'number') outputTokens += p.output_tokens;
    if (typeof p.cache_read_input_tokens === 'number')
      cacheReadInputTokens += p.cache_read_input_tokens;
    if (typeof p.cache_creation_input_tokens === 'number')
      cacheCreationInputTokens += p.cache_creation_input_tokens;
  }

  // duration_ms が一切取れていない場合のフォールバック:
  // バケット内の最初と最後のイベントの ts 差分を上限値として採用する
  // （Stop hook の入力に duration が含まれないバージョン / 旧データ向け）
  if (!hasDuration) {
    const first = Date.parse(b.firstTs);
    const last = Date.parse(b.lastTs);
    if (!Number.isNaN(first) && !Number.isNaN(last) && last > first) {
      durationMs = last - first;
    }
  }

  // subject 群を時系列でユニーク化
  const sortedCommits = [...b.commits].sort((x, y) => x.ts.localeCompare(y.ts));
  const seen = new Set<string>();
  const uniqSubjects: string[] = [];
  for (const c of sortedCommits) {
    const s = c.subject?.trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    uniqSubjects.push(s);
  }

  // name: 最初の subject。subject 全くない場合は branch / repo から
  const repoName = repoNameOf(b.repo);
  const name =
    uniqSubjects[0] ??
    (b.branch ? `${repoName ?? 'repo'} / ${b.branch}` : repoName ?? '(unknown task)');

  // notes: 残りの subject + メタ情報を時系列で並べる
  const noteLines: string[] = [];
  if (uniqSubjects.length > 1) {
    noteLines.push('## コミット一覧');
    for (const s of uniqSubjects) noteLines.push(`- ${s}`);
  }
  noteLines.push('');
  noteLines.push('## autolog メタ');
  noteLines.push(`- repo: ${repoName ?? '(unknown)'}`);
  if (b.branch) noteLines.push(`- branch: ${b.branch}`);
  if (b.jstDate) noteLines.push(`- 日付 (JST): ${b.jstDate}`);
  noteLines.push(`- 期間: ${b.firstTs} 〜 ${b.lastTs}`);
  noteLines.push(`- セッション数: ${b.sessionIds.size}`);
  noteLines.push(`- コミット数: ${sortedCommits.length}`);
  if (turnCount > 0) noteLines.push(`- 累計ターン数: ${turnCount}`);
  if (outputTokens > 0)
    noteLines.push(`- 累計トークン: 入力 ${inputTokens} / 出力 ${outputTokens}`);
  if (costUsd > 0) noteLines.push(`- 累計 Claude コスト: $${costUsd.toFixed(3)}`);

  // category: commit subject 先頭の conventional commits っぽいプレフィックスで推測
  const categoryGuess = guessCategory(uniqSubjects);

  // taskUrl: 推測しない（リポによって規約が違うため）

  const durationMin = Math.max(1, Math.round(durationMs / 60000));

  // draftKey: 取り込み済み判定に使うので決定論的に作る。
  // - jstDate があればそれを含める（同じブランチでも別日なら別キー）
  // - gap split 由来の分割では firstTs が違うので含める
  const datePart = b.jstDate ?? 'no-date';
  const draftKey = `${b.repo ?? 'unknown'}::${b.branch ?? 'detached'}::${datePart}::${b.firstTs}`;

  return {
    draftKey,
    name,
    taskUrl: undefined,
    duration: durationMin,
    reworkCount: 0,
    category: categoryGuess,
    notes: noteLines.join('\n'),
    meta: {
      repo: b.repo,
      repoName,
      branch: b.branch,
      jstDate: b.jstDate,
      sessionIds: [...b.sessionIds],
      commitCount: sortedCommits.length,
      firstTs: b.firstTs,
      lastTs: b.lastTs,
      costUsd: costUsd > 0 ? costUsd : undefined,
      turnCount: turnCount > 0 ? turnCount : undefined,
      inputTokens: inputTokens > 0 ? inputTokens : undefined,
      outputTokens: outputTokens > 0 ? outputTokens : undefined,
      cacheReadInputTokens: cacheReadInputTokens > 0 ? cacheReadInputTokens : undefined,
      cacheCreationInputTokens:
        cacheCreationInputTokens > 0 ? cacheCreationInputTokens : undefined,
    },
  };
}

/**
 * コミット subject 先頭のプレフィックスからカテゴリを推測。
 * 推測できなければ空配列。
 */
function guessCategory(subjects: string[]): string[] {
  const PREFIX_MAP: Record<string, string> = {
    feat: '機能開発',
    fix: 'バグ修正',
    refactor: 'リファクタ',
    test: 'テスト',
    docs: 'ドキュメント',
    chore: '雑務',
    perf: 'パフォーマンス',
    style: 'スタイル',
    build: 'ビルド',
    ci: 'CI',
  };
  const found = new Set<string>();
  for (const s of subjects) {
    const m = s.match(/^([a-z]+)(?:\([^)]*\))?:/i);
    if (m) {
      const cat = PREFIX_MAP[m[1].toLowerCase()];
      if (cat) found.add(cat);
    }
  }
  return [...found];
}
