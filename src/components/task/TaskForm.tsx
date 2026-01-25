import { useState } from 'react';
import { Sparkles, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTasks } from '@/hooks/useTasks';
import { TASK_CATEGORIES } from '@/constants/categories';
import { toast } from 'sonner';

export function TaskForm() {
  const { addTask } = useTasks();

  const [name, setName] = useState('');
  const [aiUsed, setAiUsed] = useState(false);
  const [duration, setDuration] = useState('');
  const [reworkCount, setReworkCount] = useState('0');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
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
        aiUsed,
        duration: Number(duration),
        reworkCount: Number(reworkCount),
        category: selectedCategories,
        notes: notes.trim(),
      });

      toast.success('タスクを記録しました');

      // フォームをリセット
      setName('');
      setAiUsed(false);
      setDuration('');
      setReworkCount('0');
      setSelectedCategories([]);
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

        {/* AI利用フラグ + 所要時間 */}
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-3 bg-primary-50 rounded-lg cursor-pointer flex-1 hover:bg-primary-100 transition-colors">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-accent-500 focus:ring-accent-300"
              checked={aiUsed}
              onChange={(e) => setAiUsed(e.target.checked)}
            />
            <Sparkles size={16} className="text-primary-500" />
            <span className="text-sm text-primary-600">AI利用</span>
          </label>
          <div className="flex items-center gap-2 px-4 py-3 bg-primary-50 rounded-lg flex-1 focus-within:ring-2 focus-within:ring-accent-200 focus-within:bg-white transition-all">
            <Clock size={16} className="text-primary-400" />
            <input
              type="number"
              placeholder="分"
              min="0"
              className="w-16 bg-transparent border-0 text-sm focus:ring-0 focus:outline-none"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <span className="text-sm text-primary-400">分</span>
          </div>
        </div>

        {/* 手戻り回数 */}
        <div>
          <label className="block text-sm font-medium text-primary-700 mb-1">手戻り回数</label>
          <input
            type="number"
            placeholder="0"
            min="0"
            className="w-full px-4 py-3 bg-primary-50 rounded-lg border-0 focus:ring-2 focus:ring-accent-200 focus:bg-white transition-all"
            value={reworkCount}
            onChange={(e) => setReworkCount(e.target.value)}
          />
        </div>

        {/* カテゴリ */}
        <div>
          <p className="text-sm text-primary-500 mb-2">カテゴリ</p>
          <div className="flex flex-wrap gap-2">
            {TASK_CATEGORIES.map((cat) => (
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
