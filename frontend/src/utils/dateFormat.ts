/**
 * 日付フォーマット関数
 * 本年中であればMM-dd HH:mm、それ以外はyyyy-MM-dd形式で表示
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const now = new Date();
  const currentYear = now.getFullYear();
  const dateYear = date.getFullYear();
  
  const pad = (num: number) => num.toString().padStart(2, '0');
  
  if (dateYear === currentYear) {
    // 本年中: MM-dd HH:mm形式
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } else {
    // 本年以外: yyyy-MM-dd形式
    return `${dateYear}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}

/**
 * レガシー用のformatDate関数（後方互換性のため）
 * @deprecated formatDisplayDateを使用してください
 */
export function formatDate(dateStr: string): string {
  return formatDisplayDate(dateStr);
}