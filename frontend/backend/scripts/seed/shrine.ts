import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

interface GeoJSONFeature {
  type: string;
  properties: {
    '@id'?: string;
    amenity?: string;
    name?: string;
    religion?: string;
    'name:ja'?: string;
    'name:ja_kana'?: string;
    [key: string]: any;
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  id: string;
}

interface GeoJSONData {
  type: string;
  features: GeoJSONFeature[];
}

function buildAddress(props: any): string {
  // addr:province, addr:city, addr:quarter, addr:block_number, addr:postcode
  const parts = [
    props['addr:province'] || '',
    props['addr:city'] || '',
    props['addr:quarter'] || '',
    props['addr:block_number'] || ''
  ];
  // 空文字を除外して連結
  const address = parts.filter(Boolean).join('');
  return address;
}

/**
 * shrines.txtから神社データを追加し、祭神リレーションも作成
 */
import * as readline from 'readline';

export async function seedShrinesFromTxt(prisma: PrismaClient, txtPath: string) {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.isAbsolute(txtPath) ? txtPath : path.join(__dirname, '..', txtPath);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return;
  const header = lines[0].split(/\t|\s{2,}/).map(h => h.trim());
  const nameIdx = header.findIndex(h => h.includes('name'));
  const locationIdx = header.findIndex(h => h.includes('location'));
  const latIdx = header.findIndex(h => h.includes('lat'));
  const lngIdx = header.findIndex(h => h.includes('long'));
  const dietiesIdx = header.findIndex(h => h.includes('dieties'));

  // 祭神名→ID辞書
  const allDieties = await prisma.diety.findMany({ select: { id: true, name: true } });
  const dietyNameToId = new Map<string, number>();
  for (const d of allDieties) {
    dietyNameToId.set(d.name.replace(/\s/g, ''), d.id);
  }

  let inserted = 0, relInserted = 0;
  const shrineDietyPairs: { shrine_id: number; diety_id: number }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/\t|\s{2,}/);
    if (cols.length < 4) continue;
    const name = cols[nameIdx]?.trim();
    const location = cols[locationIdx]?.trim();
    // 緯度・経度の区切りがカンマやタブ混在なので両方対応
    let lat = cols[latIdx]?.trim();
    let lng = cols[lngIdx]?.trim();
    if (lat && lat.includes(',')) {
      [lat, lng] = lat.split(',').map(s => s.trim());
    } else if (lng && lng.includes(',')) {
      [lng, lat] = lng.split(',').map(s => s.trim());
    }
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!name || isNaN(latNum) || isNaN(lngNum)) continue;

    // 既存の神社を確認
    const existingShrine = await prisma.shrine.findFirst({
      where: {
        AND: [
          { name: name },
          { location: location }
        ]
      }
    });

    let shrine;
    if (existingShrine) {
      // 既存の神社を更新
      shrine = await prisma.shrine.update({
        where: { id: existingShrine.id },
        data: { lat: latNum, lng: lngNum }
      });
    } else {
      // 新しい神社を作成
      shrine = await prisma.shrine.create({
        data: { name, location, lat: latNum, lng: lngNum }
      });
      inserted++;
    }

    // 祭神リレーション（既存を消さずに新規のみ追加）
    if (dietiesIdx >= 0 && cols[dietiesIdx]) {
      // カンマ・読点・全角カンマ区切り対応
      const raw = cols[dietiesIdx].replace(/、/g, ',').replace(/，/g, ',');
      const names = raw.split(',').map(s => s.trim()).filter(Boolean);
      for (const dietyName of names) {
        const id = dietyNameToId.get(dietyName.replace(/\s/g, ''));
        if (id) {
          shrineDietyPairs.push({
            shrine_id: shrine.id,
            diety_id: id
          });
        }
      }
    }
  }

  // 祭神リレーションを一括で新規追加（既存はそのまま）
  if (shrineDietyPairs.length > 0) {
    await prisma.shrineDiety.createMany({
      data: shrineDietyPairs,
      skipDuplicates: true,
    });
    relInserted = shrineDietyPairs.length;
  }

  console.log(`shrines.txtから神社${inserted}件、祭神リレーション${relInserted}件を追加しました（既存データは保持）`);
}

export async function seedShrine(prisma: PrismaClient): Promise<number[]> {
  // shrines.jsonファイルを読み込み
  const jsonPath = path.join(__dirname, 'shrines.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const geoJsonData: GeoJSONData = JSON.parse(jsonData);

  // 祭神名→ID辞書
  const allDieties = await prisma.diety.findMany({ select: { id: true, name: true } });
  const dietyNameToId = new Map<string, number>();
  for (const d of allDieties) {
    dietyNameToId.set(d.name.replace(/\s/g, ''), d.id);
  }

  // 神社データを変換
  const shrines = geoJsonData.features
    .filter(feature =>
      feature.properties.amenity === 'place_of_worship' &&
      feature.properties.religion === 'shinto' &&
      feature.properties.name // 名前があるもののみ
    )
    .map(feature => {
      const [lng, lat] = feature.geometry.coordinates;
      const location = buildAddress(feature.properties);
      return {
        name: feature.properties.name || feature.properties['name:ja'] || '無名神社',
        kana: feature.properties['name:ja_kana'] || '',
        location: location,
        lat: lat,
        lng: lng,
        saijin: feature.properties['shinto:saijin'] || '',
      };
    })
    .filter(shrine => shrine.name !== '無名神社'); // 名前がない神社は除外

  console.log(`Found ${shrines.length} shrines from JSON data`);

  // データベースに挿入
  const result = await prisma.shrine.createMany({
    data: shrines.map(({ saijin, ...rest }) => rest),
    skipDuplicates: true
  });

  console.log(`Inserted ${result.count} shrines`);

  // 神社ID逆引き用
  const allShrines = await prisma.shrine.findMany({ select: { id: true, name: true, location: true } });
  const shrineKeyToId = new Map<string, number>();
  for (const s of allShrines) {
    shrineKeyToId.set(`${s.name}__${s.location}`, s.id);
  }

  // 祭神リレーション生成
  const shrineDietyPairs: { shrine_id: number; diety_id: number }[] = [];
  for (const shrine of shrines) {
    if (!shrine.saijin) continue;
    // カンマ・読点・全角カンマ区切り対応
    const raw = shrine.saijin.replace(/、/g, ',').replace(/，/g, ',');
    const names = raw.split(',').map(s => s.trim()).filter(Boolean);
    const shrineId = shrineKeyToId.get(`${shrine.name}__${shrine.location}`);
    if (!shrineId) continue;
    for (const dietyName of names) {
      const id = dietyNameToId.get(dietyName.replace(/\s/g, ''));
      if (id) {
        shrineDietyPairs.push({ shrine_id: shrineId, diety_id: id });
      }
    }
  }
  if (shrineDietyPairs.length > 0) {
    await prisma.shrineDiety.createMany({
      data: shrineDietyPairs,
      skipDuplicates: true,
    });
    console.log(`shrines.jsonから祭神リレーション${shrineDietyPairs.length}件を追加しました（既存データは保持）`);
  }

  return allShrines.map(s => s.id);
}

