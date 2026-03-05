import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Report } from '@/types/report';

/**
 * レポートのCRUD操作を提供するカスタムフック
 */
export function useReports() {
  // 全レポートをリアクティブに取得（アップロード日時の降順）
  const reports = useLiveQuery(() =>
    db.reports.orderBy('uploadedAt').reverse().toArray()
  );

  /**
   * HTMLファイルをレポートとしてアップロード
   */
  const uploadReport = async (file: File): Promise<string> => {
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error('ファイルサイズが上限（5MB）を超えています');
    }

    const isHtml = file.type === 'text/html' || file.type === 'application/xhtml+xml' || file.type === '';
    if (!isHtml && !file.name.match(/\.(html?|htm)$/i)) {
      throw new Error('HTMLファイルのみアップロード可能です');
    }

    const id = crypto.randomUUID();
    const htmlContent = await file.text();

    await db.reports.add({
      id,
      name: file.name,
      htmlContent,
      uploadedAt: new Date(),
      size: file.size,
    });

    return id;
  };

  /**
   * レポートを削除
   */
  const deleteReport = async (id: string): Promise<void> => {
    await db.reports.delete(id);
  };

  /**
   * IDでレポートを取得
   */
  const getReportById = async (id: string): Promise<Report | undefined> => {
    return await db.reports.get(id);
  };

  return {
    reports: reports ?? [],
    uploadReport,
    deleteReport,
    getReportById,
  };
}
