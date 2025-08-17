import React, { createContext, useCallback, useContext, useState } from 'react';

type ModalType = { type: 'shrine' | 'diety' | 'user' | 'mission' | 'notification', id: number } | null;

// ナビゲーション履歴の型
interface NavigationHistoryItem {
  type: 'shrine' | 'diety' | 'user' | 'mission' | 'notification';
  id: number;
  name: string;
}

interface ModalContextType {
  // モーダル状態
  modal: ModalType;
  currentUserId: number | null;

  // ナビゲーション履歴
  navigationHistory: NavigationHistoryItem[];
  historyIndex: number;

  // モーダル操作
  openModal: (type: 'shrine' | 'diety' | 'user' | 'mission' | 'notification', id: number, clearHistory?: boolean) => void;
  closeModal: () => void;

  // ナビゲーション操作
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;

  // 履歴情報
  getPreviousItemName: () => string;
  getNextItemName: () => string;
  getPreviousItemType: () => 'shrine' | 'diety' | 'user' | 'mission';
  getNextItemType: () => 'shrine' | 'diety' | 'user' | 'mission';

  // データ更新
  updateCurrentModalName: (name: string) => void;

  // ユーザーID設定
  setCurrentUserId: (userId: number | null) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: React.ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modal, setModal] = useState<ModalType>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 履歴に追加
  const addToHistory = useCallback((type: 'shrine' | 'diety' | 'user' | 'mission', id: number, name: string) => {
    const newItem: NavigationHistoryItem = { type, id, name };
    const newHistory = navigationHistory.slice(0, historyIndex + 1);
    newHistory.push(newItem);
    setNavigationHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [navigationHistory, historyIndex]);

  // モーダルを開く
  const openModal = useCallback((type: 'shrine' | 'diety' | 'user' | 'mission' | 'notification', id: number, clearHistory: boolean = false) => {
    const initialName = '';

    if (clearHistory) {
      setNavigationHistory([{ type, id, name: initialName }]);
      setHistoryIndex(0);
    } else {
      // 同じアイテムが既に現在の位置にある場合は履歴を追加しない
      const currentItem = navigationHistory[historyIndex];
      if (currentItem && currentItem.type === type && currentItem.id === id) {
        setModal({ type, id });
        return;
      }
      addToHistory(type, id, initialName);
    }

    setModal({ type, id });
  }, [navigationHistory, historyIndex, addToHistory]);

  // モーダルを閉じる
  const closeModal = useCallback(() => {
    setModal(null);
    setNavigationHistory([]);
    setHistoryIndex(-1);
  }, []);

  // 戻る
  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const prevItem = navigationHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setModal({ type: prevItem.type, id: prevItem.id });
    }
  }, [historyIndex, navigationHistory]);

  // 進む
  const goForward = useCallback(() => {
    if (historyIndex < navigationHistory.length - 1) {
      const nextItem = navigationHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setModal({ type: nextItem.type, id: nextItem.id });
    }
  }, [historyIndex, navigationHistory]);

  // 現在のモーダル名を更新
  const updateCurrentModalName = useCallback((name: string) => {
    if (modal && navigationHistory.length > 0 && historyIndex >= 0) {
      const currentItem = navigationHistory[historyIndex];
      if (currentItem && currentItem.name !== name) {
        const updatedHistory = [...navigationHistory];
        updatedHistory[historyIndex] = { ...updatedHistory[historyIndex], name };
        setNavigationHistory(updatedHistory);
      }
    }
  }, [modal, navigationHistory, historyIndex]);

  // 前のアイテム名を取得
  const getPreviousItemName = useCallback(() => {
    if (historyIndex > 0) {
      return navigationHistory[historyIndex - 1].name;
    }
    return '';
  }, [historyIndex, navigationHistory]);

  // 次のアイテム名を取得
  const getNextItemName = useCallback(() => {
    if (historyIndex < navigationHistory.length - 1) {
      return navigationHistory[historyIndex + 1].name;
    }
    return '';
  }, [historyIndex, navigationHistory]);

  // 前のアイテムタイプを取得
  const getPreviousItemType = useCallback((): 'shrine' | 'diety' | 'user' | 'mission' | 'notification' => {
    if (historyIndex > 0) {
      return navigationHistory[historyIndex - 1].type;
    }
    return 'shrine';
  }, [historyIndex, navigationHistory]);

  // 次のアイテムタイプを取得
  const getNextItemType = useCallback((): 'shrine' | 'diety' | 'user' | 'mission' | 'notification' => {
    if (historyIndex < navigationHistory.length - 1) {
      return navigationHistory[historyIndex + 1].type;
    }
    return 'shrine';
  }, [historyIndex, navigationHistory]);

  const value: ModalContextType = {
    modal,
    currentUserId,
    navigationHistory,
    historyIndex,
    openModal,
    closeModal,
    goBack,
    goForward,
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < navigationHistory.length - 1,
    getPreviousItemName,
    getNextItemName,
    getPreviousItemType,
    getNextItemType,
    updateCurrentModalName,
    setCurrentUserId,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};
