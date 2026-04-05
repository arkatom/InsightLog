# improvements log (append-only)

<!--
  このファイルは Heartbeat (/heartbeat) が自動追記する。
  手動での追記も可能だが、フォーマットを厳守すること。
  過去のエントリを編集・削除しないこと（append-only）。
  Status遷移: proposed → applied → verified (または proposed → rejected)
-->

## 2026-03-28 -- ユーザー前提の未確認による生成物やり直し
- Symptom: サンプルデータ生成時、AIツールの配分をユーザーに確認せず「バランスよく」生成した結果、ユーザーの実態（Claudeメイン）と乖離し、全件やり直しが発生した
- Root cause: prompt
- Fix: 生成物（サンプルデータ、テンプレート、命名等）を作る前に、ユーザーの前提・好み・実態を確認する手順をスキル定義に追加する
- Preventive check: 生成系タスク開始時に「前提確認を行ったか」をセルフチェック。具体的にはユーザーへの質問が1回以上あるか会話を振り返る
- Expected impact: 生成物のやり直し頻度が減少し、1回目の出力精度が向上する
- Risk & rollback: 確認ステップ追加による若干の遅延。不要と判断されればスキル定義から削除するだけ
- Status: applied

## 2026-03-28 -- 命名・配置の前提確認が再発防止できていない
- Symptom: 「ユーザー前提の未確認」を applied にした直後のセッションで、命名を3回変更（openclaw-adopt → adopt → kaizen）、ディレクトリを2回移動（docs/_openclaw → docs/_heartbeat → .claude/memory/）が発生。前提確認のルールが適用されていなかった
- Root cause: procedure
- Fix: スキル・ディレクトリの新規作成時に「名前」「配置場所」「日本語話者にとっての分かりやすさ」の3点をユーザーに確認するチェックリストを soul.md に追加する
- Preventive check: 新規ファイル/ディレクトリ作成のgit diffに、事前のAskUserQuestion呼び出しが含まれているか確認
- Expected impact: 命名・配置の後出し変更がゼロになる
- Risk & rollback: 確認ステップが増えることで速度が落ちる可能性。soul.mdから該当行を削除するだけで元に戻せる
- Status: applied

## 2026-03-29 -- 外部ツール出力の未検証による誤情報伝達
- Symptom: insight コマンドが提案した `claude --session` フラグが実在せず、ユーザーが実行してエラー（`error: unknown option '--session'`）が発生。誤った情報をそのまま中継してしまった
- Root cause: procedure
- Fix: 外部ツール（insight, /doctor 等）が出力した CLI コマンド・フラグを中継する前に、`claude --help` や公式ドキュメントで実在を確認するステップを挟む
- Preventive check: 外部ツール出力に含まれるCLIコマンドを提示する際、`command --help | grep flag` で存在確認してから伝達する
- Expected impact: ユーザーが誤コマンドでエラーに遭遇する頻度がゼロになる
- Risk & rollback: 確認ステップにより応答が数秒遅れる。手順を省略するだけで元に戻せる
- Status: applied

## 2026-04-04 -- 裏取りなしの技術提案による信頼低下と手戻り
- Symptom: VSCode設定（チャットペイン非表示）を公式ドキュメントで確認せず推測で提案し効かなかった。APIキーエラーのトラブルシュートでもcurlによる検証を行わず「クォート混入では」と推測を述べ、ユーザーに「調査はしたのか？」「間抜けはしない」と指摘された。計5往復以上の手戻り
- Root cause: procedure
- Fix: 技術的な提案（設定値、トラブルシュート仮説）を出す前に、公式ドキュメント検索または検証コマンド（curl、grep、--help等）を1回以上実行する手順を標準化する
- Preventive check: 技術提案を含むアシスタント出力の直前に、WebSearch/WebFetch/Bashによる裏取り呼び出しが1回以上あるかを確認する
- Expected impact: 「効くかわからないが試してみましょう」型の提案がゼロになり、ユーザーの信頼が維持される
- Risk & rollback: 裏取りステップにより応答が数秒遅れる。速度優先と判断されれば手順を省略するだけで元に戻せる
- Status: applied

## 2026-04-04 -- 提案前のユーザー制約ヒアリング不足（前提未確認の再発）
- Symptom: 研修Issue設計で、受講生の前提知識・時間制約・AIツールの能力特性を確認せず案を3つ提示。ユーザーから「sonnerはCLAUDE.mdに書いてない」「25分待つのは非現実的」「Claude Codeが賢すぎて差が出ない」と3点指摘され、切り口自体を変更する羽目になった
- Root cause: prompt
- Fix: 提案系タスク（設計・命名・ツール選定等）の開始時に、「対象者は誰か」「時間・技術的制約は何か」「本質的に何を達成したいか」の3点を必ず確認してから案を出す
- Preventive check: 提案を含むアシスタント出力の前に、上記3点に対応するユーザーへの質問または会話内での確認が1回以上あるか振り返る
- Expected impact: 提案の方向性ミスによる手戻り（切り口変更レベル）がゼロになる
- Risk & rollback: ヒアリングステップにより応答が1ターン遅れる。不要と判断されれば省略するだけ
- Status: proposed
