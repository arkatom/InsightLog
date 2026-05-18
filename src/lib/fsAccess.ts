// File System Access API のラッパー
// 対応: Chromium 系 (Chrome / Edge / Opera)。Firefox / Safari は非対応。
// 非対応ブラウザでは型エラーを避けるため、`as any` ではなく feature detection で分岐する。

import { db, type AutologSource } from './db';

interface ShowOpenFilePickerOptions {
  types?: { description?: string; accept?: Record<string, string[]> }[];
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
}

type ShowOpenFilePicker = (
  opts?: ShowOpenFilePickerOptions
) => Promise<FileSystemFileHandle[]>;

type WindowWithFsApi = Window & { showOpenFilePicker?: ShowOpenFilePicker };

/** File System Access API が利用可能か */
export function isFsAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

/** ピッカーを開いて handle を返す。非対応ブラウザは null。 */
export async function pickJsonlFile(): Promise<FileSystemFileHandle | null> {
  const w = window as WindowWithFsApi;
  if (!w.showOpenFilePicker) return null;
  try {
    const [handle] = await w.showOpenFilePicker({
      types: [
        {
          description: 'JSON Lines',
          accept: { 'application/x-ndjson': ['.jsonl', '.json', '.txt'] },
        },
      ],
      multiple: false,
    });
    return handle;
  } catch (err) {
    // ユーザーがキャンセルしたら AbortError。それ以外は再送出。
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

/** 保存された handle を取得し、必要なら read 権限を再要求する */
export async function getRememberedHandle(): Promise<FileSystemFileHandle | null> {
  const src = await db.autologSource.get('default');
  return src?.fileHandle ?? null;
}

export async function getRememberedSource(): Promise<AutologSource | undefined> {
  return db.autologSource.get('default');
}

interface PermissionAwareHandle {
  queryPermission?: (opts: { mode: 'read' }) => Promise<PermissionState>;
  requestPermission?: (opts: { mode: 'read' }) => Promise<PermissionState>;
}

/** read 権限を確保する。granted なら true */
export async function ensureReadPermission(
  handle: FileSystemFileHandle
): Promise<boolean> {
  const h = handle as FileSystemFileHandle & PermissionAwareHandle;
  if (h.queryPermission) {
    const cur = await h.queryPermission({ mode: 'read' });
    if (cur === 'granted') return true;
  }
  if (h.requestPermission) {
    const next = await h.requestPermission({ mode: 'read' });
    return next === 'granted';
  }
  // 旧 API: getFile が走ればよしとする
  return true;
}

/** 記憶用に handle と filename を保存する */
export async function rememberSource(
  handle: FileSystemFileHandle | null,
  fileName: string
): Promise<void> {
  await db.autologSource.put({
    id: 'default',
    fileHandle: handle ?? undefined,
    fileName,
    lastReadAt: new Date(),
  });
}

/** handle から File を読む */
export async function readHandleAsText(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}
