// 距離計算の共通ロジック
export interface Coordinates {
  lat: number;
  lng: number;
}

// 地球の半径（メートル）
export const EARTH_RADIUS_METERS = 6371000;
// 地球の円周（メートル）
export const EARTH_CIRCUMFERENCE_METERS = 2 * Math.PI * EARTH_RADIUS_METERS;

/**
 * 2点間の距離を計算（メートル単位）
 * Haversine formulaを使用
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = EARTH_RADIUS_METERS; // 地球の半径（メートル）
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 度をラジアンに変換
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 参拝可能距離を計算
 * @param level ユーザーレベル
 * @param rangeAbility 距離能力レベル
 * @param subscriptionMultiplier サブスクリプション倍率
 * @returns 参拝可能距離（メートル）
 */
export function calculatePrayDistance(
  level: number,
  rangeAbility: number = 0,
  subscriptionMultiplier: number = 1
): number {
  const { BASE_PRAY_DISTANCE } = require('../constants/levelSystem').LEVEL_SYSTEM;
  
  // 基本距離 + レベルによる増加 + 能力による増加
  const baseDistance = BASE_PRAY_DISTANCE + (level * 10) + (rangeAbility * 50);
  
  // サブスクリプション効果を適用
  return Math.floor(baseDistance * subscriptionMultiplier);
}

/**
 * 遥拝回数を計算
 * @param level ユーザーレベル
 * @param worshipAbility 遥拝能力レベル
 * @param subscriptionBoost サブスクリプション追加回数
 * @returns 遥拝回数
 */
export function calculateWorshipCount(
  level: number,
  worshipAbility: number = 0,
  subscriptionBoost: number = 0
): number {
  const { BASE_WORSHIP_COUNT } = require('../constants/levelSystem').LEVEL_SYSTEM;
  
  // 基本回数 + レベルによる増加 + 能力による増加 + サブスクリプション効果
  return BASE_WORSHIP_COUNT + Math.floor(level / 10) + worshipAbility + subscriptionBoost;
} 

/**
 * 指定した緯度・経度から、東方向に指定距離（メートル）だけ移動した経度を返す
 */
export function addMetersToLng(lat: number, lng: number, meters: number): number {
  return lng + (meters / (EARTH_RADIUS_METERS * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI);
} 