---
name: reflection
description: セッション終了時に振り返りを生成する。Handshake（要約）・摩擦ポイント・得られた知見・刺さった指示パターンを構造化して記録し、次回のセッションとHeartbeat改善サイクルの両方に活用する。
---

# 振り返り

## 概要

セッション終了時に構造化された振り返りMarkdownを生成し、ファイルに出力する。

## 実行手順

1. **振り返り内容を生成**: [テンプレート](./references/template.md)に従って振り返りを生成。冒頭のHandshake（4行要約）から書き始め、摩擦ポイントは事実ベースで具体的に書く
2. **ディレクトリ確認・作成**: `docs/memory/reflection/` ディレクトリが存在しない場合は作成
3. **ファイル出力**: `docs/memory/reflection/YYYYMMDD_{やったことを簡潔に}.md` にWrite
4. **完了報告**: 保存したファイルパスを報告
5. **heartbeat**: `/heartbeat` スキルを実行して改善サイクルに反映する
