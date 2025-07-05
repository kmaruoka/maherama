import wa from './wa';
import dark from './dark';

export const skins = {
  wa,
  dark,
  // ここに他スキンも追加可能
};

export type SkinName = keyof typeof skins;

export default skins; 