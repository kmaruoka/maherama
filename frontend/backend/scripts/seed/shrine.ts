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
    // 神社を追加
    const shrine = await prisma.shrine.upsert({
      where: { name_location: { name, location } },
      update: { lat: latNum, lng: lngNum },
      create: { name, location, lat: latNum, lng: lngNum },
    });
    inserted++;
    // 祭神リレーション
    if (dietiesIdx >= 0 && cols[dietiesIdx]) {
      // カンマ・読点・全角カンマ区切り対応
      const raw = cols[dietiesIdx].replace(/、/g, ',').replace(/，/g, ',');
      const names = raw.split(',').map(s => s.trim()).filter(Boolean);
      for (const dietyName of names) {
        const id = dietyNameToId.get(dietyName.replace(/\s/g, ''));
        if (id) {
          await prisma.shrineDiety.upsert({
            where: { shrine_id_diety_id: { shrine_id: shrine.id, diety_id: id } },
            update: {},
            create: { shrine_id: shrine.id, diety_id: id },
          });
          relInserted++;
        }
      }
    }
  }
  console.log(`shrines.txtから神社${inserted}件、祭神リレーション${relInserted}件を追加/更新しました`);
}

export async function seedShrine(prisma: PrismaClient): Promise<number[]> {
  // shrines.jsonファイルを読み込み
  const jsonPath = path.join(__dirname, 'shrines.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const geoJsonData: GeoJSONData = JSON.parse(jsonData);

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
      };
    })
    .filter(shrine => shrine.name !== '無名神社'); // 名前がない神社は除外

  console.log(`Found ${shrines.length} shrines from JSON data`);

  // データベースに挿入
  const result = await prisma.shrine.createMany({ 
    data: shrines, 
    skipDuplicates: true 
  });

  console.log(`Inserted ${result.count} shrines`);

  const allShrines = await prisma.shrine.findMany({ select: { id: true } });
  return allShrines.map(s => s.id);
}
