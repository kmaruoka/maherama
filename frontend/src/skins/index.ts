import wa from './wa';
import sakura from './sakura';
import forest from './forest';
import dark from './dark';
import snow from './snow';

export const skins = {
  wa,
  sakura,
  forest,
  dark,
  snow,
};

export type SkinName = keyof typeof skins;

export default skins; 