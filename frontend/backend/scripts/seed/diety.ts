import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
const sharp = require('sharp');

// アップロード済みファイル管理用のJSONファイル
const UPLOADED_FILES_PATH = path.join(__dirname, 'uploaded_diety_images.json');

interface UploadedFileInfo {
  originalName: string;
  uploadedName: string;
  urls: {
    original: string;
    urlXs: string;
    urlS: string;
    urlM: string;
    urlL: string;
    urlXl: string;
  };
  imageId: number;
}

interface UploadedFilesData {
  [originalName: string]: UploadedFileInfo;
}

// アップロード済みファイル情報を読み込み
function loadUploadedFiles(): UploadedFilesData {
  try {
    if (fs.existsSync(UPLOADED_FILES_PATH)) {
      const data = fs.readFileSync(UPLOADED_FILES_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Failed to load uploaded files data:', error);
  }
  return {};
}

// アップロード済みファイル情報を保存
function saveUploadedFiles(data: UploadedFilesData): void {
  try {
    fs.writeFileSync(UPLOADED_FILES_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save uploaded files data:', error);
  }
}

// 画像をアップロードして各サイズを生成
async function uploadDietyImage(
  prisma: PrismaClient,
  originalName: string,
  imagePath: string
): Promise<UploadedFileInfo> {
  const yyyymm = new Date().toISOString().slice(0, 7).replace('-', '');
  const uploadDir = path.join(__dirname, '..', '..', '..', 'public', 'images', yyyymm);
  
  // アップロードディレクトリを作成
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // ファイル名を生成（diety + 元ファイル名）
  const baseName = path.parse(originalName).name;
  const uploadedName = `diety-${baseName}`;
  
  // 各サイズのファイル名を生成
  const sizes = {
    original: '',
    urlXs: '64',
    urlS: '160',
    urlM: '256',
    urlL: '512',
    urlXl: '1024'
  };

  const fileNames: { [key: string]: string } = {};
  const filePaths: { [key: string]: string } = {};

  // 各サイズのファイル名とパスを生成
  for (const [size, suffix] of Object.entries(sizes)) {
    const fileName = suffix ? `${uploadedName}_${suffix}.jpg` : `${uploadedName}.jpg`;
    fileNames[size] = fileName;
    filePaths[size] = path.join(uploadDir, fileName);
  }

  // 画像を各サイズでリサイズして保存
  const imageBuffer = fs.readFileSync(imagePath);
  
  // 64x64 (マーカー用)
  await sharp(imageBuffer)
    .resize(64, 64)
    .jpeg({ quality: 90 })
    .toFile(filePaths.urlXs);

  // 160x160
  await sharp(imageBuffer)
    .resize(160, 160)
    .jpeg({ quality: 90 })
    .toFile(filePaths.urlS);

  // 256x256
  await sharp(imageBuffer)
    .resize(256, 256)
    .jpeg({ quality: 90 })
    .toFile(filePaths.urlM);

  // 512x512
  await sharp(imageBuffer)
    .resize(512, 512)
    .jpeg({ quality: 90 })
    .toFile(filePaths.urlL);

  // オリジナルサイズ（1024px以下に制限）
  await sharp(imageBuffer)
    .resize(1024, 1024, { fit: 'inside' })
    .jpeg({ quality: 90 })
    .toFile(filePaths.original);

  // URLを生成
  const urls = {
    url: `/images/${yyyymm}/${fileNames.original}`,
    urlXs: `/images/${yyyymm}/${fileNames.urlXs}`,
    urlS: `/images/${yyyymm}/${fileNames.urlS}`,
    urlM: `/images/${yyyymm}/${fileNames.urlM}`,
    urlL: `/images/${yyyymm}/${fileNames.urlL}`,
    urlXl: `/images/${yyyymm}/${fileNames.urlXl}`
  };

  // Imageテーブルに登録
  const image = await prisma.image.create({
    data: {
      original_url: urls.url,
      url_xs: urls.urlXs,
      url_s: urls.urlS,
      url_m: urls.urlM,
      url_l: urls.urlL,
      url_xl: urls.urlXl,
      uploaded_by: 'シードデータ'
    }
  });

  return {
    originalName,
    uploadedName,
    urls: {
      original: urls.url,
          urlXs: urls.urlXs,
    urlS: urls.urlS,
    urlM: urls.urlM,
    urlL: urls.urlL,
    urlXl: urls.urlXl
    },
    imageId: image.id
  };
}

export async function seedDiety(prisma: PrismaClient) {
  // アップロード済みファイル情報を読み込み
  const uploadedFiles = loadUploadedFiles();
  
  // dieties.txtファイルを読み込み
  const txtPath = path.join(__dirname, '..', 'dieties.txt');
  const fileContent = fs.readFileSync(txtPath, 'utf-8');
  
  // 行ごとに分割し、ヘッダー行を除外
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  const dataLines = lines.slice(1); // ヘッダー行（id	name	reading	image	description）を除外
  
  // タブ区切りで分割してデータを変換
  const dieties = dataLines.map((line) => {
    const [id, name, reading, image, description] = line.split('\t');
    
    // nameが空の場合はスキップ
    if (!name || !name.trim()) {
      console.warn(`Skipping line with empty name: ${line}`);
      return null;
    }
    
    return {
      id: Number(id?.trim() || 0),
      name: name.trim(),
      kana: reading?.trim() || '',
      image: image?.trim() || '',
      description: description?.trim() || null
    };
  }).filter(diety => diety !== null && diety.id > 0);

  console.log(`Found ${dieties.length} dieties from TXT data`);

  // データベースに一括挿入（skipDuplicatesで重複をスキップ）
  const result = await prisma.diety.createMany({
    data: dieties.map(({ image, ...diety }) => diety), // imageは除外
    skipDuplicates: true,
  });
  console.log(`Inserted ${result.count} dieties (${dieties.length - result.count} duplicates skipped)`);

  // 画像データがある場合はアップロード処理
  const dietiesWithImages = dieties.filter(d => d.image);
  console.log(`Processing ${dietiesWithImages.length} dieties with images`);

  for (const diety of dietiesWithImages) {
    try {
      const imagePath = path.join(__dirname, 'images', diety.image);
      
      // 画像ファイルが存在しない場合はスキップ
      if (!fs.existsSync(imagePath)) {
        console.warn(`Image file not found: ${imagePath}`);
        continue;
      }

      let fileInfo: UploadedFileInfo;

      // 既にアップロード済みかチェック
      if (uploadedFiles[diety.image]) {
        console.log(`Using existing uploaded image for ${diety.image}`);
        fileInfo = uploadedFiles[diety.image];
        
        // Imageテーブルに実際に存在するかチェック
        const existingImage = await prisma.image.findUnique({
          where: { id: fileInfo.imageId }
        });
        
        if (!existingImage) {
          console.log(`Image ID ${fileInfo.imageId} not found in database, re-uploading: ${diety.image}`);
          // 新規アップロード
          fileInfo = await uploadDietyImage(prisma, diety.image, imagePath);
          
          // アップロード済みファイル情報を更新
          uploadedFiles[diety.image] = fileInfo;
          saveUploadedFiles(uploadedFiles);
        }
      } else {
        // 新規アップロード
        console.log(`Uploading new image: ${diety.image}`);
        fileInfo = await uploadDietyImage(prisma, diety.image, imagePath);
        
        // アップロード済みファイル情報に追加
        uploadedFiles[diety.image] = fileInfo;
        saveUploadedFiles(uploadedFiles);
      }

      // Dietyテーブルを更新
      await prisma.diety.update({
        where: { id: diety.id },
        data: {
          image_id: fileInfo.imageId,
          image_url: fileInfo.urls.original,
          image_url_xs: fileInfo.urls.urlXs,
          image_url_s: fileInfo.urls.urlS,
          image_url_m: fileInfo.urls.urlM,
          image_url_l: fileInfo.urls.urlL,
          image_url_xl: fileInfo.urls.urlXl,
          image_by: 'admin'
        }
      });

      console.log(`Updated diety ${diety.id} (${diety.name}) with image`);
    } catch (error) {
      console.error(`Failed to process image for diety ${diety.id} (${diety.name}):`, error);
    }
  }
  
  console.log(`Completed image processing for ${dietiesWithImages.length} dieties`);
}
