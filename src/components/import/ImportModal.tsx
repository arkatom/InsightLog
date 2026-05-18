import { useState, useMemo, useRef } from 'react';
import { Upload, ArrowLeft, GitBranch, Clock, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TaskForm } from '@/components/task/TaskForm';
import { parseEventsJsonl, aggregateToDrafts } from '@/lib/import';
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
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 期間フィルタを掛けた下書き
  const drafts = useMemo(() => {
    return aggregateToDrafts(events, {
      since: since || undefined,
      until: until || undefined,
    });
  }, [events, since, until]);

  const remainingDrafts = drafts.filter((d) => !completedKeys.has(d.draftKey));
  const editingDraft = drafts.find((d) => d.draftKey === editingKey);

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseEventsJsonl(text);
      if (parsed.length === 0) {
        toast.error('events.jsonl に有効なイベントが見つかりませんでした');
        return;
      }
      setEvents(parsed);
      setCompletedKeys(new Set());
      setView('list');
      toast.success(`${parsed.length} 件のイベントを読み込みました`);
    } catch (err) {
      toast.error('ファイルの読み込みに失敗しました');
      console.error(err);
    }
  };

  const handleStartEdit = (draftKey: string) => {
    setEditingKey(draftKey);
    setView('edit');
  };

  const handleSaved = () => {
    if (editingKey) {
      setCompletedKeys((prev) => new Set(prev).add(editingKey));
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
    setCompletedKeys(new Set());
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
        <FileView fileInputRef={fileInputRef} onFile={handleFile} />
      )}

      {view === 'list' && (
        <ListView
          drafts={drafts}
          completedKeys={completedKeys}
          since={since}
          until={until}
          onChangeSince={setSince}
          onChangeUntil={setUntil}
          onEdit={handleStartEdit}
          onReset={handleReset}
          remainingCount={remainingDrafts.length}
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
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-primary-600">
        Claude Code の hooks が出力した <code className="px-1 bg-primary-100 rounded">events.jsonl</code> を選択してください。
      </p>
      <p className="text-xs text-primary-500">
        既定の場所: <code className="px-1 bg-primary-100 rounded">$HOME/.claude/tmp/autolog/events.jsonl</code>
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".jsonl,.json,application/json,application/x-ndjson,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          // 同じファイルの再選択を許可するため value をリセット
          e.target.value = '';
        }}
      />
      <Button onClick={() => fileInputRef.current?.click()} className="w-full" size="lg">
        <Upload size={18} className="mr-2 inline" />
        events.jsonl を選択
      </Button>
    </div>
  );
}

function ListView({
  drafts,
  completedKeys,
  since,
  until,
  onChangeSince,
  onChangeUntil,
  onEdit,
  onReset,
  remainingCount,
}: {
  drafts: DraftTask[];
  completedKeys: Set<string>;
  since: string;
  until: string;
  onChangeSince: (s: string) => void;
  onChangeUntil: (s: string) => void;
  onEdit: (key: string) => void;
  onReset: () => void;
  remainingCount: number;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-primary-500 text-xs">since (UTC)</span>
          <input
            type="date"
            value={since}
            onChange={(e) => onChangeSince(e.target.value)}
            className="px-2 py-1 bg-primary-50 rounded border-0 focus:ring-2 focus:ring-accent-200 focus:bg-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-primary-500 text-xs">until (UTC)</span>
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
          下書き <strong>{drafts.length}</strong> 件 / 残り <strong>{remainingCount}</strong> 件
        </span>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-primary-500 hover:text-primary-800 underline"
        >
          別のファイルを選ぶ
        </button>
      </div>

      {drafts.length === 0 ? (
        <div className="text-sm text-primary-500 text-center py-8">
          該当期間に下書き化できるイベントが見つかりませんでした。
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map((d) => {
            const done = completedKeys.has(d.draftKey);
            return (
              <button
                key={d.draftKey}
                type="button"
                onClick={() => onEdit(d.draftKey)}
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
  onSaved: () => void;
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

/** 今日の日付（UTC、YYYY-MM-DD） */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
