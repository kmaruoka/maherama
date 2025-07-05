import wa from './wa';

export const skins = {
  wa,
  // ここに他スキンも追加可能
};

export type SkinName = keyof typeof skins;

export default skins; 