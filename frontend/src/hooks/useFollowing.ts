import { useState, useEffect } from 'react';
import { API_BASE } from '../config/api';

interface FollowingUser {
  id: number;
  name: string;
  thumbnailUrl: string;
}

export default function useFollowing(userId?: number) {
  const [data, setData] = useState<FollowingUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowing = async () => {
    if (!userId) {
      setData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/users/${userId}/following`);
      if (!response.ok) {
        throw new Error('フォロー一覧の取得に失敗しました');
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
    fetchFollowing();
  }, [userId]);

  return { data, isLoading, error, refetch: fetchFollowing };
} 