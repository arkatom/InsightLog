#!/usr/bin/env bash
# =============================================================================
# Playwright 録画ビデオ → GIF 変換スクリプト
#
# 使い方:
#   ./demo/gif-convert.sh
#   ./demo/gif-convert.sh demo/screenshots/test-results/my-test.webm
#
# 前提:
#   ffmpeg が必要: brew install ffmpeg
# =============================================================================
set -euo pipefail

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${DEMO_DIR}/screenshots"
mkdir -p "${OUTPUT_DIR}"

# ffmpeg の存在確認
if ! command -v ffmpeg &> /dev/null; then
  echo "⚠️  ffmpeg が見つかりません"
  echo "   インストール: brew install ffmpeg"
  echo ""
  echo "   ffmpeg なしの代替案:"
  echo "   - Playwright の video ファイル（.webm）をそのまま使用"
  echo "   - https://cloudconvert.com/webm-to-gif でオンライン変換"
  exit 1
fi

echo "🎬 GIF 変換を開始します..."
echo "   出力先: ${OUTPUT_DIR}"
echo ""

# 引数でファイルが指定された場合はそのファイルのみ変換
if [[ $# -gt 0 ]]; then
  VIDEOS=("$@")
else
  # デフォルト: test-results 配下の全 .webm を対象
  mapfile -t VIDEOS < <(find "${DEMO_DIR}/screenshots/test-results" -name "*.webm" 2>/dev/null)
fi

if [[ ${#VIDEOS[@]} -eq 0 ]]; then
  echo "⚠️  変換対象の .webm ファイルが見つかりません"
  echo "   Playwright テスト実行後に再度お試しください"
  exit 0
fi

CONVERTED=0
for VIDEO in "${VIDEOS[@]}"; do
  if [[ ! -f "${VIDEO}" ]]; then
    continue
  fi

  BASENAME=$(basename "${VIDEO}" .webm)
  GIF_PATH="${OUTPUT_DIR}/${BASENAME}.gif"

  echo "  📹 ${VIDEO}"
  echo "  ➡  ${GIF_PATH}"

  # 2パス変換（パレット最適化で高品質 GIF を生成）
  PALETTE_TMP=$(mktemp /tmp/palette_XXXX.png)
  ffmpeg -y -i "${VIDEO}" \
    -vf "fps=8,scale=800:-1:flags=lanczos,palettegen=stats_mode=diff" \
    "${PALETTE_TMP}" -loglevel error

  ffmpeg -y -i "${VIDEO}" -i "${PALETTE_TMP}" \
    -filter_complex "fps=8,scale=800:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer" \
    -loop 0 "${GIF_PATH}" -loglevel error

  rm -f "${PALETTE_TMP}"

  SIZE=$(du -sh "${GIF_PATH}" | cut -f1)
  echo "  ✅ 完了 (${SIZE})"
  echo ""

  CONVERTED=$((CONVERTED + 1))
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 ${CONVERTED}件の GIF を生成しました"
echo "   ${OUTPUT_DIR}"
