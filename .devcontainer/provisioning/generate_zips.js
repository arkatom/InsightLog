import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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

const trainees = lines.slice(1).map((line) => {
  // ダブルクォートを考慮した簡易パース
  const values = line
    .match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
    .map((v) => v.replace(/(^"|"$)/g, ''));
  return { name: values[0], email: values[1], apiKey: values[2] };
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

  // 個別 .env の作成
  const envContent = `ANTHROPIC_API_KEY=${trainee.apiKey}\nTRAINEE_NAME="${trainee.name}"\nTRAINEE_EMAIL="${trainee.email}"\n`;
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
