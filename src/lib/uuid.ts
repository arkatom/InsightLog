/**
 * UUIDv4を生成する
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
