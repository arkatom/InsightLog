import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const scriptDir = import.meta.dirname;
const projectRoot = path.resolve(scriptDir, '../..');

// CSVの読み込みとパース（簡易版）
const csvPath = path.join(scriptDir, 'trainees.csv');
if (!fs.existsSync(csvPath)) {
  console.error('エラー: trainees.csv が見つかりません。');
  console.error(`期待するパス: ${csvPath}`);
  console.error('trainees.csv.example をコピーして作成してください。');
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter((line) => line.trim() !== '');

const trainees = lines.slice(1).map((line, index) => {
  // ダブルクォートを考慮した簡易パース
  const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
  if (!values || values.length < 5) {
    console.error(`エラー: ${index + 2}行目のフォーマットが不正です: ${line}`);
    console.error('必要な列: name,email,api_key,github_username,github_password');
    process.exit(1);
  }
  const cleaned = values.map((v) => v.replace(/(^"|"$)/g, ''));
  return { name: cleaned[0], email: cleaned[1], apiKey: cleaned[2], githubUsername: cleaned[3], githubPassword: cleaned[4] };
});

const baseDir = path.join(projectRoot, 'base_template');
const outputDir = path.join(projectRoot, 'dist_zips');

// base_template/ を git archive から自動生成
console.log('📦 base_template/ を作成しています...');
if (fs.existsSync(baseDir)) {
  execSync(`rm -rf "${baseDir}"`);
}
fs.mkdirSync(baseDir);
execSync(`git -C "${projectRoot}" archive HEAD | tar -x -C "${baseDir}"`);
console.log('✅ base_template/ の作成が完了しました。');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

trainees.forEach((trainee) => {
  const safeName = trainee.name.replace(/\s+/g, '_');
  const tempDir = path.join(outputDir, `InsightLog_${safeName}`);

  // テンプレートのコピー
  execSync(`cp -r "${baseDir}" "${tempDir}"`);

  // 個別 .env の作成（全値をダブルクォートで囲み、source 時の安全性を確保）
  const envContent = `ANTHROPIC_API_KEY="${trainee.apiKey}"\nTRAINEE_NAME="${trainee.name}"\nTRAINEE_EMAIL="${trainee.email}"\nGITHUB_USERNAME="${trainee.githubUsername}"\nGITHUB_PASSWORD="${trainee.githubPassword}"\n`;
  fs.writeFileSync(path.join(tempDir, '.env'), envContent);

  // ZIP化と一時ディレクトリの削除
  const zipName = `InsightLog_${safeName}.zip`;
  execSync(`cd "${outputDir}" && zip -r "${zipName}" "InsightLog_${safeName}"`);
  execSync(`rm -rf "${tempDir}"`);

  console.log(`Generated: ${zipName}`);
});

// base_template/ のクリーンアップ
execSync(`rm -rf "${baseDir}"`);

console.log('🎉 すべてのパッケージ生成が完了しました。');
