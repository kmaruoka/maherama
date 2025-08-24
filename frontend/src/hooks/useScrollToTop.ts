import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ページ遷移時にスクロール位置をトップにリセットするフック
 */
export const useScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
};
