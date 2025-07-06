import wa from './wa';
import sakura from './sakura';
import forest from './forest';
import ai from './ai';
import moon from './moon';
import snow from './snow';
import kane from './kane';

export const skins = {
  wa,
  sakura,
  forest,
  ai,
  moon,
  snow,
  kane,
};

export type SkinName = keyof typeof skins;

export default skins; 