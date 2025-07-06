import { useState, useEffect } from 'react';
import { API_BASE, apiCall } from '../config/api';

interface FollowerUser {
  id: number;
  name: string;
  thumbnailUrl: string;
}

export default function useFollowers(userId?: number) {
  const [data, setData] = useState<FollowerUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowers = async () => {
    if (!userId) {
      setData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiCall(`${API_BASE}/users/${userId}/followers`);
      if (!response.ok) {
        throw new Error('フォロワー一覧の取得に失敗しました');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowers();
  }, [userId]);

  return { data, isLoading, error, refetch: fetchFollowers };
} 