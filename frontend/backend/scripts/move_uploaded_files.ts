import * as fs from 'fs';
import * as path from 'path';

async function moveUploadedFiles() {
  console.log('アップロード済みファイルの移動を開始します...');

  const sourceDir = path.join(__dirname, '..', '..', 'uploads');
  const targetDir = path.join(__dirname, '..', '..', 'public', 'images');

  try {
    // ソースディレクトリが存在するかチェック
    if (!fs.existsSync(sourceDir)) {
      console.log('ソースディレクトリが存在しません:', sourceDir);
      return;
    }

    // ターゲットディレクトリを作成
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log('ターゲットディレクトリを作成しました:', targetDir);
    }

    // ソースディレクトリ内のすべてのファイルとディレクトリを取得
    const items = fs.readdirSync(sourceDir);

    for (const item of items) {
      const sourcePath = path.join(sourceDir, item);
      const targetPath = path.join(targetDir, item);
      const stats = fs.statSync(sourcePath);

      if (stats.isDirectory()) {
        // ディレクトリの場合、再帰的に移動
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }

        const subItems = fs.readdirSync(sourcePath);
        for (const subItem of subItems) {
          const subSourcePath = path.join(sourcePath, subItem);
          const subTargetPath = path.join(targetPath, subItem);

          if (fs.existsSync(subTargetPath)) {
            console.log(`ファイルが既に存在します、スキップ: ${subTargetPath}`);
            continue;
          }

          fs.copyFileSync(subSourcePath, subTargetPath);
          console.log(`ファイルを移動しました: ${subSourcePath} -> ${subTargetPath}`);
        }

        // 元のディレクトリを削除
        fs.rmSync(sourcePath, { recursive: true, force: true });
        console.log(`ディレクトリを削除しました: ${sourcePath}`);
      } else {
        // ファイルの場合、直接移動
        if (fs.existsSync(targetPath)) {
          console.log(`ファイルが既に存在します、スキップ: ${targetPath}`);
          continue;
        }

        fs.copyFileSync(sourcePath, targetPath);
        fs.unlinkSync(sourcePath);
        console.log(`ファイルを移動しました: ${sourcePath} -> ${targetPath}`);
      }
    }

    console.log('✅ アップロード済みファイルの移動が完了しました。');
  } catch (error) {
    console.error('❌ ファイル移動中にエラーが発生しました:', error);
  }
}

// スクリプトを実行
moveUploadedFiles();
