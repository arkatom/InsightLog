import { useState, useMemo, useRef, useEffect } from 'react';
import { Upload, ArrowLeft, GitBranch, Clock, FileText, EyeOff, Eye, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TaskForm } from '@/components/task/TaskForm';
import { parseEventsJsonl, aggregateToDrafts } from '@/lib/import';
import { useImportedDrafts } from '@/hooks/useImportedDrafts';
import {
  isFsAccessSupported,
  pickJsonlFile,
  getRememberedSource,
  ensureReadPermission,
  ensureWritePermission,
  rememberSource,
  readHandleAsText,
} from '@/lib/fsAccess';
import { purgeImportedFromJsonl } from '@/lib/autologMaintenance';
import type { AutologSource } from '@/lib/db';
import type { DraftTask, AutologEvent } from '@/types/import';
import { toast } from 'sonner';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type View = 'file' | 'list' | 'edit';

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [view, setView] = useState<View>('file');
  const [events, setEvents] = useState<AutologEvent[]>([]);
  const [since, setSince] = useState<string>(() => today());
  const [until, setUntil] = useState<string>(() => today());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showImported, setShowImported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 取り込み済み draftKey の永続セット
  const { importedKeys, recordImport } = useImportedDrafts();

  // 期間フィルタを掛けた下書き
  const allDrafts = useMemo(() => {
    return aggregateToDrafts(events, {
      since: since || undefined,
      until: until || undefined,
    });
  }, [events, since, until]);

  // 取り込み済みを除外（showImported が true の時は全件表示）
  const visibleDrafts = showImported
    ? allDrafts
    : allDrafts.filter((d) => !importedKeys.has(d.draftKey));

  const remainingCount = allDrafts.filter((d) => !importedKeys.has(d.draftKey)).length;
  const importedCount = allDrafts.length - remainingCount;
  const editingDraft = allDrafts.find((d) => d.draftKey === editingKey);

  const ingestText = (text: string, fileLabel: string): boolean => {
    const parsed = parseEventsJsonl(text);
    if (parsed.length === 0) {
      toast.error(`${fileLabel} に有効なイベントが見つかりませんでした`);
      return false;
    }
    setEvents(parsed);
    setView('list');
    toast.success(`${parsed.length} 件のイベントを読み込みました`);
    return true;
  };

  /** 通常の <input type=file> 経由（FileSystemFileHandle 取れない） */
  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      if (ingestText(text, file.name)) {
        // handle 無しでも filename だけは記憶（次回フォールバック表示用）
        await rememberSource(null, file.name);
      }
    } catch (err) {
      toast.error('ファイルの読み込みに失敗しました');
      console.error(err);
    }
  };

  /** File System Access API 経由でピック → handle を IndexedDB に保存（読込 + 書込権限を一括取得） */
  const handlePickWithFsApi = async () => {
    try {
      const handle = await pickJsonlFile();
      if (!handle) return; // キャンセル
      const ok = await ensureReadPermission(handle);
      if (!ok) {
        toast.error('読み込み権限が拒否されました');
        return;
      }
      // 取り込み済みイベントを events.jsonl から削除するために書込権限も要求しておく
      // 拒否されてもインポート自体は続行（削除機能だけ無効化）
      await ensureWritePermission(handle);
      const text = await readHandleAsText(handle);
      if (ingestText(text, handle.name)) {
        await rememberSource(handle, handle.name);
      }
    } catch (err) {
      toast.error('ファイルの読み込みに失敗しました');
      console.error(err);
    }
  };

  /** 前回のハンドルから一発で再読込 */
  const handleReadSaved = async (handle: FileSystemFileHandle) => {
    try {
      const ok = await ensureReadPermission(handle);
      if (!ok) {
        toast.error('読み込み権限が拒否されました');
        return;
      }
      await ensureWritePermission(handle);
      const text = await readHandleAsText(handle);
      if (ingestText(text, handle.name)) {
        await rememberSource(handle, handle.name);
      }
    } catch (err) {
      toast.error('前回のファイルの読み込みに失敗しました（消えた可能性があります）');
      console.error(err);
    }
  };

  /** 取り込み成功時に events.jsonl から該当イベントを物理削除（FS API 経由、書込権限がある場合のみ） */
  const tryPurgeFromJsonl = async (justImportedDraftKey: string) => {
    if (!isFsAccessSupported()) return;
    const source = await getRememberedSource();
    if (!source?.fileHandle) return;
    // 現時点の取り込み済み全体 + 今回追加分（useLiveQuery が再評価される前なので明示追加）
    const allImported = new Set([...importedKeys, justImportedDraftKey]);
    try {
      const result = await purgeImportedFromJsonl(source.fileHandle, allImported, {
        aggregateOpts: { since: since || undefined, until: until || undefined },
      });
      if (result.removedCount > 0) {
        toast.success(
          `events.jsonl から ${result.removedCount} 件のイベントを削除しました`
        );
        // 同じファイルから再集計し直すために events を更新
        const fresh = await readHandleAsText(source.fileHandle);
        const parsedFresh = parseEventsJsonl(fresh);
        setEvents(parsedFresh);
      }
    } catch (err) {
      // write permission denied 等は静かに諦める（IndexedDB seen-set のフォールバックで継続）
      console.warn('events.jsonl の削減はスキップされました', err);
    }
  };

  const handleStartEdit = (draftKey: string) => {
    setEditingKey(draftKey);
    setView('edit');
  };

  const handleSaved = async (taskId: string) => {
    if (editingDraft) {
      try {
        await recordImport(editingDraft, taskId);
      } catch (err) {
        console.error('取り込み済み記録に失敗しました', err);
        // 記録失敗は致命的ではないので toast で警告するだけ
        toast.error('取り込み記録の保存に失敗しました（タスク自体は保存済み）');
      }
      // events.jsonl からも該当イベントを物理削除（FS API 書込権限がある場合のみ）
      await tryPurgeFromJsonl(editingDraft.draftKey);
    }
    setEditingKey(null);
    setView('list');
  };

  const handleBackToList = () => {
    setEditingKey(null);
    setView('list');
  };

  const handleReset = () => {
    setEvents([]);
    setEditingKey(null);
    setView('file');
  };

  const handleCloseModal = () => {
    // 編集中は誤操作で閉じないよう list に戻す
    if (view === 'edit') {
      handleBackToList();
      return;
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCloseModal} title="autolog インポート">
      {view === 'file' && (
        <FileView
          fileInputRef={fileInputRef}
          onFile={handleFile}
          onPickWithFsApi={handlePickWithFsApi}
          onReadSaved={handleReadSaved}
        />
      )}

      {view === 'list' && (
        <ListView
          drafts={visibleDrafts}
          importedKeys={importedKeys}
          since={since}
          until={until}
          onChangeSince={setSince}
          onChangeUntil={setUntil}
          onEdit={handleStartEdit}
          onReset={handleReset}
          remainingCount={remainingCount}
          importedCount={importedCount}
          showImported={showImported}
          onToggleShowImported={() => setShowImported((v) => !v)}
        />
      )}

      {view === 'edit' && editingDraft && (
        <EditView draft={editingDraft} onBack={handleBackToList} onSaved={handleSaved} />
      )}
    </Modal>
  );
}

function FileView({
  fileInputRef,
  onFile,
  onPickWithFsApi,
  onReadSaved,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  onPickWithFsApi: () => void;
  onReadSaved: (handle: FileSystemFileHandle) => void;
}) {
  const [saved, setSaved] = useState<AutologSource | undefined>();
  const fsSupported = isFsAccessSupported();

  useEffect(() => {
    getRememberedSource().then(setSaved);
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-primary-600">
        Claude Code の hooks が出力した <code className="px-1 bg-primary-100 rounded">events.jsonl</code> を選択してください。
      </p>
      <p className="text-xs text-primary-500">
        既定の場所: <code className="px-1 bg-primary-100 rounded">$HOME/.claude/tmp/autolog/events.jsonl</code>
      </p>

      {/* 前回のソース情報 */}
      {saved && (
        <div className="p-3 bg-primary-50 rounded-lg text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-primary-500">前回:</span>
            <span className="font-mono text-primary-700">{saved.fileName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-primary-500">最終読込:</span>
            <span className="text-primary-700">{formatRelativeTime(saved.lastReadAt)}</span>
          </div>
        </div>
      )}

      {/* 再読込ボタン（前回 handle が残っている時のみ） */}
      {saved?.fileHandle && (
        <Button
          onClick={() => onReadSaved(saved.fileHandle!)}
          className="w-full"
          size="lg"
          variant="primary"
        >
          <RefreshCw size={18} className="mr-2 inline" />
          前回のファイルから再読込
        </Button>
      )}

      {/* 新規ピック */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jsonl,.json,application/json,application/x-ndjson,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      <Button
        onClick={() => (fsSupported ? onPickWithFsApi() : fileInputRef.current?.click())}
        className="w-full"
        size="lg"
        variant={saved?.fileHandle ? 'secondary' : 'primary'}
      >
        <Upload size={18} className="mr-2 inline" />
        {saved?.fileHandle ? '別のファイルを選ぶ' : 'events.jsonl を選択'}
      </Button>

      {!fsSupported && (
        <p className="text-xs text-primary-400">
          このブラウザは File System Access API 非対応のため、毎回ファイル選択が必要です（Chrome / Edge を推奨）。
        </p>
      )}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min} 分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 時間前`;
  const d = Math.floor(h / 24);
  return `${d} 日前`;
}

function ListView({
  drafts,
  importedKeys,
  since,
  until,
  onChangeSince,
  onChangeUntil,
  onEdit,
  onReset,
  remainingCount,
  importedCount,
  showImported,
  onToggleShowImported,
}: {
  drafts: DraftTask[];
  importedKeys: Set<string>;
  since: string;
  until: string;
  onChangeSince: (s: string) => void;
  onChangeUntil: (s: string) => void;
  onEdit: (key: string) => void;
  onReset: () => void;
  remainingCount: number;
  importedCount: number;
  showImported: boolean;
  onToggleShowImported: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-primary-500 text-xs">since (JST)</span>
          <input
            type="date"
            value={since}
            onChange={(e) => onChangeSince(e.target.value)}
            className="px-2 py-1 bg-primary-50 rounded border-0 focus:ring-2 focus:ring-accent-200 focus:bg-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-primary-500 text-xs">until (JST)</span>
          <input
            type="date"
            value={until}
            onChange={(e) => onChangeUntil(e.target.value)}
            className="px-2 py-1 bg-primary-50 rounded border-0 focus:ring-2 focus:ring-accent-200 focus:bg-white"
          />
        </label>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-primary-600">
          残り <strong>{remainingCount}</strong> 件
          {importedCount > 0 && (
            <span className="text-primary-400 ml-1">／ 取り込み済 {importedCount} 件</span>
          )}
        </span>
        <div className="flex items-center gap-3">
          {importedCount > 0 && (
            <button
              type="button"
              onClick={onToggleShowImported}
              className="text-xs text-primary-500 hover:text-primary-800 flex items-center gap-1"
              title="取り込み済みの再表示は通常不要。確認用"
            >
              {showImported ? <EyeOff size={12} /> : <Eye size={12} />}
              {showImported ? '取り込み済みを隠す' : '取り込み済みも表示'}
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-primary-500 hover:text-primary-800 underline"
          >
            別のファイルを選ぶ
          </button>
        </div>
      </div>

      {drafts.length === 0 ? (
        <div className="text-sm text-primary-500 text-center py-8">
          {remainingCount === 0 && importedCount > 0
            ? '該当期間の下書きはすべて取り込み済みです 🎉'
            : '該当期間に下書き化できるイベントが見つかりませんでした。'}
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map((d) => {
            const done = importedKeys.has(d.draftKey);
            return (
              <button
                key={d.draftKey}
                type="button"
                onClick={() => !done && onEdit(d.draftKey)}
                disabled={done}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  done
                    ? 'bg-primary-50 border-primary-100 opacity-50 cursor-not-allowed'
                    : 'bg-white border-primary-200 hover:border-accent-400 hover:bg-accent-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-medium text-sm text-primary-800 line-clamp-2">
                    {d.name}
                  </div>
                  {done && (
                    <span className="text-xs text-green-600 whitespace-nowrap">✓ 取り込み済</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-primary-500">
                  <span className="flex items-center gap-1">
                    <GitBranch size={12} />
                    {d.meta.repoName ?? '?'} / {d.meta.branch ?? 'detached'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {d.duration} 分
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={12} />
                    {d.meta.commitCount} commits
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditView({
  draft,
  onBack,
  onSaved,
}: {
  draft: DraftTask;
  onBack: () => void;
  onSaved: (taskId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-primary-500 hover:text-primary-800 flex items-center gap-1"
      >
        <ArrowLeft size={14} /> 下書き一覧に戻る
      </button>
      <TaskForm initialDraft={draft} onSaved={onSaved} />
    </div>
  );
}

/** 今日の日付（JST、YYYY-MM-DD）— aggregateToDrafts が JST 解釈なので合わせる */
function today(): string {
  const jstMs = Date.now() + 9 * 60 * 60 * 1000;
  return new Date(jstMs).toISOString().slice(0, 10);
}
