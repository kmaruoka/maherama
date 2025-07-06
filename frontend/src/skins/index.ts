import wa from './wa';
import dark from './dark';
import modern from './modern';
import forest from './forest';
import sakura from './sakura';

export const skins = {
  wa,
  dark,
  modern,
  forest,
  sakura,
};

export type SkinName = keyof typeof skins;

export default skins; 