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
