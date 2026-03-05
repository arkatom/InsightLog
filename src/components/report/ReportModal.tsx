import { useState, useRef } from 'react';
import { X, FileText, Upload, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useReports } from '@/hooks/useReports';
import type { Report } from '@/types/report';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const [view, setView] = useState<'list' | 'viewer'>('list');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { reports, uploadReport, deleteReport } = useReports();

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadReport(file);
      toast.success('レポートをアップロードしました');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'アップロードに失敗しました');
    }
    // input をリセットして同じファイルを再度選択可能にする
    e.target.value = '';
  };

  const handleView = (report: Report) => {
    setSelectedReport(report);
    setView('viewer');
  };

  const handleBackToList = () => {
    setSelectedReport(null);
    setView('list');
  };

  const handleClose = () => {
    setView('list');
    setSelectedReport(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-in">
      <div
        className={`bg-white rounded-2xl w-full ${
          view === 'viewer' ? 'max-w-4xl' : 'max-w-lg'
        } max-h-[90vh] overflow-hidden fade-in`}
      >
        {/* ヘッダー */}
        <div className="p-4 border-b flex justify-between items-center">
          {view === 'viewer' ? (
            <button
              onClick={handleBackToList}
              className="flex items-center gap-1 text-primary-600 hover:text-primary-800 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">一覧に戻る</span>
            </button>
          ) : (
            <h2 className="font-bold text-lg">HTMLレポート</h2>
          )}
          <button onClick={handleClose} className="hover:bg-primary-100 rounded p-1 transition-colors">
            <X size={24} className="text-primary-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 overflow-y-auto max-h-[80vh]">
          {view === 'list' ? (
            <div className="space-y-3">
              {/* アップロードボタン */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-primary-300 rounded-xl text-primary-600 hover:bg-primary-50 hover:border-primary-400 transition-colors"
              >
                <Upload size={18} />
                <span className="text-sm font-medium">HTMLファイルをアップロード</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm"
                hidden
                onChange={handleFileChange}
              />

              {/* レポート一覧 */}
              {reports.length === 0 ? (
                <div className="text-center py-12 text-primary-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p>レポートがありません</p>
                  <p className="text-xs mt-1">HTMLファイルをアップロードして閲覧できます</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl"
                    >
                      <FileText size={18} className="text-primary-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary-800 truncate">
                          {report.name}
                        </p>
                        <p className="text-xs text-primary-400">
                          {report.uploadedAt.toLocaleDateString('ja-JP')} ・{' '}
                          {(report.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => handleView(report)}
                        className="px-3 py-1.5 text-xs font-medium bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        閲覧
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await deleteReport(report.id);
                          } catch {
                            toast.error('レポートの削除に失敗しました');
                          }
                        }}
                        className="p-1.5 text-primary-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Viewer モード */
            selectedReport && (
              <div>
                <h3 className="text-sm font-medium text-primary-600 mb-3">
                  {selectedReport.name}
                </h3>
                <iframe
                  srcDoc={selectedReport.htmlContent}
                  sandbox="allow-scripts"
                  className="w-full h-[600px] border border-primary-200 rounded-lg"
                  title={selectedReport.name}
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
