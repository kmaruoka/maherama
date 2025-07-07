export const barriers = {
  normal: { name: '通常', className: 'barrier-normal' },
  wave: { name: '波', className: 'barrier-wave' },
  search: { name: '探', className: 'barrier-search' },
};

export type BarrierName = keyof typeof barriers;

export default barriers;
