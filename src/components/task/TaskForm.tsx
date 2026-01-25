import { useState, useEffect } from 'react';
import { Sparkles, Clock, RotateCcw, Link as LinkIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTasks } from '@/hooks/useTasks';
import { useSessions } from '@/hooks/useSessions';
import { useSettings } from '@/hooks/useSettings';
import { TASK_CATEGORIES } from '@/constants/categories';
import { toast } from 'sonner';
import { secondsToMinutes } from '@/lib/time';

export function TaskForm() {
  const { addTask } = useTasks();
  const { getTodaySessions } = useSessions();
  const { settings, updateSettings } = useSettings();

  const [name, setName] = useState('');
  const [taskUrl, setTaskUrl] = useState('');
  const [aiUsed, setAiUsed] = useState(false);
  const [duration, setDuration] = useState('');
  const [reworkCount, setReworkCount] = useState('0');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [notes, setNotes] = useState('');

  // 全カテゴリ（固定 + カスタム）
  const allCategories = [...TASK_CATEGORIES, ...(settings.customCategories || [])];

  // 作業時間を自動計算
  useEffect(() => {
    const fetchTodayDuration = async () => {
      const sessions = await getTodaySessions();
      const workSessions = sessions.filter(
        (s) => s.type === 'work' && s.completedAt && !s.interrupted
      );
      const totalSeconds = workSessions.reduce((sum, s) => sum + s.actualDuration, 0);
      const totalMinutes = secondsToMinutes(totalSeconds);

      if (totalMinutes > 0 && !duration) {
        setDuration(totalMinutes.toString());
      }
    };

    fetchTodayDuration();
  }, [getTodaySessions]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );

    // 「その他」の選択状態を追跡
    if (category === 'その他') {
      setShowCustomCategoryInput((prev) => !prev);
    }
  };

  const handleAddCustomCategory = () => {
    if (!customCategory.trim()) {
      return;
    }

    const newCategory = customCategory.trim();

    // 既に存在する場合はスキップ
    if (allCategories.includes(newCategory)) {
      toast.error('既に存在するカテゴリです');
      return;
    }

    // カスタムカテゴリを設定に保存
    updateSettings({
      customCategories: [...(settings.customCategories || []), newCategory],
    });

    // 選択状態に追加
    setSelectedCategories((prev) => [...prev, newCategory]);

    // 入力欄をクリア
    setCustomCategory('');
    toast.success(`カテゴリ「${newCategory}」を追加しました`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('タスク名を入力してください');
      return;
    }

    if (!duration || Number(duration) <= 0) {
      toast.error('所要時間を入力してください');
      return;
    }

    if (selectedCategories.length === 0) {
      toast.error('カテゴリを選択してください');
      return;
    }

    try {
      await addTask({
        name: name.trim(),
        taskUrl: taskUrl.trim() || undefined,
        aiUsed,
        duration: Number(duration),
        reworkCount: Number(reworkCount),
        category: selectedCategories,
        notes: notes.trim(),
      });

      toast.success('タスクを記録しました');

      // フォームをリセット
      setName('');
      setTaskUrl('');
      setAiUsed(false);
      setDuration('');
      setReworkCount('0');
      setSelectedCategories([]);
      setShowCustomCategoryInput(false);
      setNotes('');
    } catch (error) {
      toast.error('タスクの記録に失敗しました');
      console.error(error);
    }
  };

  return (
    <Card>
      <h2 className="font-bold text-primary-800 mb-4">タスク記録</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* タスク名 */}
        <Input
          type="text"
          placeholder="タスク名を入力"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* タスクURL */}
        <div className="flex items-center gap-2 px-4 py-3 bg-primary-50 rounded-lg focus-within:ring-2 focus-within:ring-accent-200 focus-within:bg-white transition-all">
          <LinkIcon size={16} className="text-primary-400" />
          <input
            type="url"
            placeholder="タスクURL（GitHub Issue, Jiraなど）"
            className="flex-1 bg-transparent border-0 text-sm focus:ring-0 focus:outline-none"
            value={taskUrl}
            onChange={(e) => setTaskUrl(e.target.value)}
          />
        </div>

        {/* AI利用 + 所要時間 + 手戻り回数（横並び） */}
        <div className="grid grid-cols-3 gap-3">
          {/* AI利用 */}
          <label className="flex items-center gap-2 px-3 py-3 bg-primary-50 rounded-lg cursor-pointer hover:bg-primary-100 transition-colors">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-accent-500 focus:ring-accent-300"
              checked={aiUsed}
              onChange={(e) => setAiUsed(e.target.checked)}
            />
            <Sparkles size={14} className="text-primary-500" />
            <span className="text-xs text-primary-600 whitespace-nowrap">AI利用</span>
          </label>

          {/* 所要時間 */}
          <div className="flex items-center gap-2 px-3 py-3 bg-primary-50 rounded-lg focus-within:ring-2 focus-within:ring-accent-200 focus-within:bg-white transition-all">
            <Clock size={14} className="text-primary-400" />
            <input
              type="number"
              placeholder="分"
              min="0"
              className="w-12 bg-transparent border-0 text-sm focus:ring-0 focus:outline-none"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <span className="text-xs text-primary-400">分</span>
          </div>

          {/* 手戻り回数 */}
          <div className="flex items-center gap-2 px-3 py-3 bg-primary-50 rounded-lg focus-within:ring-2 focus-within:ring-accent-200 focus-within:bg-white transition-all">
            <RotateCcw size={14} className="text-primary-400" />
            <input
              type="number"
              placeholder="0"
              min="0"
              className="w-12 bg-transparent border-0 text-sm focus:ring-0 focus:outline-none"
              value={reworkCount}
              onChange={(e) => setReworkCount(e.target.value)}
            />
            <span className="text-xs text-primary-400">回</span>
          </div>
        </div>

        {/* カテゴリ */}
        <div>
          <p className="text-sm text-primary-500 mb-2">カテゴリ</p>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((cat) => (
              <label key={cat} className="cursor-pointer">
                <input
                  type="checkbox"
                  className="peer hidden"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => handleCategoryToggle(cat)}
                />
                <span className="px-3 py-1.5 bg-primary-100 rounded-full text-sm text-primary-600 peer-checked:bg-primary-800 peer-checked:text-white transition-colors">
                  {cat}
                </span>
              </label>
            ))}
          </div>

          {/* カスタムカテゴリ入力（「その他」選択時） */}
          {showCustomCategoryInput && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="カスタムカテゴリ名を入力"
                className="flex-1 px-4 py-2 bg-primary-50 rounded-lg border-0 focus:ring-2 focus:ring-accent-200 focus:bg-white text-sm transition-all"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomCategory();
                  }
                }}
              />
              <Button type="button" size="sm" onClick={handleAddCustomCategory}>
                追加
              </Button>
            </div>
          )}
        </div>

        {/* 振り返りメモ */}
        <div>
          <textarea
            placeholder="良かった・悪かったプロンプト、改善点、気付きなど"
            rows={3}
            className="w-full px-4 py-3 bg-primary-50 rounded-lg border-0 focus:ring-2 focus:ring-accent-200 focus:bg-white text-sm resize-none transition-all"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* 保存ボタン */}
        <Button type="submit" className="w-full" size="lg">
          タスクを記録
        </Button>
      </form>
    </Card>
  );
}
