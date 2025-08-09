const waSkin = {
  name: '和',
  colors: {
    background: '#f6f1e7', // 少し赤みのある生成色（和紙ベース）
    surface: '#fdfaf3',
    primary: '#c7a76c', // 落ち着いた黄土色
    accent: '#a77f3d',  // 和風の茶系アクセント（金の彩度を抑制）
    text: '#222',
    border: '#c7a76c',
    shadow: 'rgba(100, 80, 40, 0.18)',
    card: '#fbf8ef',
    tagShrine: '#f5ede2', // 彩度を落とした薄生成（社殿）
    tagDiety: '#eef5ec',  // 淡い緑がかった和紙（自然神）
    tagUser: '#edf3fa',   // 薄い藍鼠（人とのつながり）
    tagShrineText: '#b05e1e', // 柿茶（穏やかな朱）
    tagDietyText: '#33691e',  // 深緑（自然・森）
    tagUserText: '#1e3a5f',   // 藍色（人情と知性）
    rankingTabBg: '#fdfaf3',
    rankingTabActiveBg: '#fbf8ef',
    rankingRowBg: '#fbf8ef',
    rankingRowBorder: '#d4bc94',
    rankingSection: '#5d4037', // 濃い焦茶（引き締め）
    logText: '#222',
    section: '#5d4037',

    scrollbarThumb: '#c7a76c',
    scrollbarTrack: '#eae2cc',
    scrollbarThumbHover: '#a77f3d',
    tabInactive: 'linear-gradient(to bottom, #c8bca8 0%, #eae2cc 100%)',
    disabled: '#e0e0e0',
    textMuted: '#aaa',
  },
  borderRadius: '1.5rem',
  fontFamily: '"Noto Serif JP", serif',
  boxShadow: '0 8px 32px 0 rgba(100, 80, 40, 0.18), 0 0 0 6px #f6f1e7',
  modal: {
    maxWidth: '600px',
    padding: '2rem 1.5rem',
    background: 'radial-gradient(circle at 50% 30%, #fdfaf3 0%, #f6f1e7 100%)',
  },
};

export default waSkin;
