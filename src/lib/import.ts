// Claude Code hooks の autolog (events.jsonl) を InsightLog の下書きタスクへ変換する

import type {
  AutologEvent,
  SessionStartEvent,
  SessionProgressEvent,
  GitCommitEvent,
  DraftTask,
  AggregateOptions,
} from '@/types/import';

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
    'git_commit',
    'git_push',
    'git_checkout',
  ].includes(o.type);
}

/**
 * 期間フィルタの判定。境界は両端を含む（since 00:00:00 〜 until 23:59:59.999）。
 */
function inRange(ts: string, since?: string, until?: string): boolean {
  if (since && ts < `${since}T00:00:00.000Z`) return false;
  if (until && ts > `${until}T23:59:59.999Z`) return false;
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
 * events から「repo × branch」単位で下書きタスクを生成する。
 *
 * グルーピング規則:
 *   - 同じ (repo, branch) に属する全イベントを 1 タスクの候補とする
 *   - repo か branch が無いイベントは "(unknown-repo)" / "(detached)" にフォールバック
 *   - duration_ms はそのセッション群の最新 session_progress を採用（複数セッションがあれば合算）
 *   - subject は時系列でユニーク化（同じメッセージの重複コミットは1回）
 *
 * 制約:
 *   - 同じブランチで複数の論理タスクをこなした日は 1 つにまとまる（人間が分割編集する前提）
 */
export function aggregateToDrafts(
  events: AutologEvent[],
  opts: AggregateOptions = {}
): DraftTask[] {
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
    sessionIds: Set<string>;
    commits: GitCommitEvent[];
    starts: SessionStartEvent[];
    progress: SessionProgressEvent[];
    firstTs: string;
    lastTs: string;
  };

  const buckets = new Map<string, Bucket>();
  const keyOf = (repo?: string, branch?: string) =>
    `${repo ?? '(unknown-repo)'}::${branch ?? '(detached)'}`;

  for (const e of filtered) {
    const k = keyOf(e.repo, e.branch);
    let b = buckets.get(k);
    if (!b) {
      b = {
        repo: e.repo,
        branch: e.branch,
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
        b.progress.push(e);
        break;
      // git_push / git_checkout は集計に直接寄与しない（境界候補のみ）
    }
  }

  // commit が 0 件のバケットは「セッションは開いたが何もコミットしてない」状態。
  // タスク化する意味が薄いので除外。session のみ拾いたいユースケースが出たら緩める。
  const drafts: DraftTask[] = [];
  for (const b of buckets.values()) {
    if (b.commits.length === 0) continue;
    drafts.push(buildDraft(b));
  }

  // 開始時刻の昇順で並べる（古いものから順）
  drafts.sort((a, b) => a.meta.firstTs.localeCompare(b.meta.firstTs));
  return drafts;
}

function buildDraft(b: {
  repo?: string;
  branch?: string;
  sessionIds: Set<string>;
  commits: GitCommitEvent[];
  starts: SessionStartEvent[];
  progress: SessionProgressEvent[];
  firstTs: string;
  lastTs: string;
}): DraftTask {
  // duration: セッション単位の最新 session_progress を合算
  const lastBySession = new Map<string, SessionProgressEvent>();
  for (const p of b.progress) {
    const cur = lastBySession.get(p.session_id);
    if (!cur || p.ts > cur.ts) {
      lastBySession.set(p.session_id, p);
    }
  }
  let durationMs = 0;
  let costUsd = 0;
  for (const p of lastBySession.values()) {
    if (typeof p.duration_ms === 'number') durationMs += p.duration_ms;
    if (typeof p.cost_usd === 'number') costUsd += p.cost_usd;
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
  noteLines.push(`- 期間: ${b.firstTs} 〜 ${b.lastTs}`);
  noteLines.push(`- セッション数: ${b.sessionIds.size}`);
  noteLines.push(`- コミット数: ${sortedCommits.length}`);
  if (costUsd > 0) noteLines.push(`- 累計 Claude コスト: $${costUsd.toFixed(3)}`);

  // category: commit subject 先頭の conventional commits っぽいプレフィックスで推測
  const categoryGuess = guessCategory(uniqSubjects);

  // taskUrl: 推測しない（リポによって規約が違うため）

  const durationMin = Math.max(1, Math.round(durationMs / 60000));

  return {
    draftKey: `${b.repo ?? 'unknown'}::${b.branch ?? 'detached'}::${b.firstTs}`,
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
      sessionIds: [...b.sessionIds],
      commitCount: sortedCommits.length,
      firstTs: b.firstTs,
      lastTs: b.lastTs,
      costUsd: costUsd > 0 ? costUsd : undefined,
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
