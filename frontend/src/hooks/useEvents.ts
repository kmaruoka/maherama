import { useState, useEffect } from 'react';
import { API_BASE, apiCall } from '../config/api';

export interface Event {
  id: number;
  name: string;
  content: string;
  image_id: number | null;
  image_url: string | null;
  start_at: string;
  end_at: string;
  image: {
    url_l: string | null;
    url_m: string | null;
    url_s: string | null;
    url_xl: string | null;
    url_xs: string | null;
  } | null;
  event_missions: {
    mission: {
      id: number;
      name: string;
      content: string;
    };
  }[];
}

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await apiCall(`${API_BASE}/events`);
        const data = await response.json();
        setEvents(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setError('イベントの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return { events, loading, error };
} 