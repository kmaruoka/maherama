const snowSkin = {
  name: '雪',
  colors: {
    background: '#f8f9fa',            // 雪の地面（ほのかに青みのある白）
    surface: '#f1f3f5',               // 雪雲のような柔らかいグレー
    primary: '#90a4ae',               // 冬空を思わせるブルーグレー
    accent: '#b0bec5',                // 淡い銀青色（アクセントは控えめに）
    text: '#2e2e2e',                  // やや濃いチャコール（夜明けの木立の影）
    border: '#cfd8dc',                // 霜の縁のような色
    shadow: 'rgba(0, 0, 0, 0.06)',    // 柔らかな冬の光
    card: '#ffffff',
    tagShrine: '#e3f2fd',             // 雪の下から見える空色
    tagDiety: '#e8f5e9',              // 霜柱を思わせる淡い緑白
    tagUser: '#ede7f6',               // 冬霞のような薄紫
    tagShrineText: '#1565c0',         // くすみ青（冷たい空気）
    tagDietyText: '#2e7d32',          // 雪に耐える常緑の色
    tagUserText: '#6a1b9a',           // 薄曇りの中の紫（個性）
    disabled: '#bdbdbd',
    textMuted: '#666666', // 可読性向上のため少し濃く
  },
  borderRadius: '1.5rem',
  fontFamily: '"Noto Serif JP", serif',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.06), 0 0 0 6px #f8f9fa',
  modal: {
    maxWidth: '600px',
    padding: '2rem 1.5rem',
    background: 'radial-gradient(circle at 50% 30%, #ffffff 0%, #f1f3f5 100%)',
  },
};

export default snowSkin;
