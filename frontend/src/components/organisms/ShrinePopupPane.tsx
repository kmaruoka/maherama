import { useMutation, useQueryClient } from '@tanstack/react-query';
import CustomText from '../atoms/CustomText';
import CustomLink from '../atoms/CustomLink';

const API_PORT = import.meta.env.VITE_API_PORT || import.meta.env.PORT || '3000';
const API_BASE = `http://localhost:${API_PORT}`;

export interface Shrine {
  id: number;
  name: string;
  lat: number;
  lng: number;
  count: number;
  registeredAt: string;
  kana?: string;
}

export default function ShrinePane({ shrine, refetchLogs, onShowDetail }: { shrine: Shrine; refetchLogs: () => void; onShowDetail?: (id: number) => void; }) {
  const queryClient = useQueryClient();
  const prayMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/shrines/${id}/pray`, {
        method: 'POST',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrines'] });
      refetchLogs();
    },
  });

  const remoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/shrines/${id}/remote-pray`, {
        method: 'POST',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrines'] });
      refetchLogs();
    },
  });

  return (
    <div className="space-y-2">
      <img src="/vite.svg" alt="サムネイル" className="w-full h-24 object-contain mb-1" />
      <div className="flex flex-col">
        <CustomText>{shrine.kana}</CustomText>
      </div>
      <div className="flex flex-col">
        <span
          className="text-blue-600 underline cursor-pointer"
          onClick={() => onShowDetail && onShowDetail(shrine.id)}
        >
          {shrine.name}
        </span>
      </div>
      <div className="flex flex-col">
      <CustomText>参拝数: {shrine.count}</CustomText>
      </div>
      <button
        className="px-2 py-1 bg-blue-500 text-white rounded"
        onClick={() => prayMutation.mutate(shrine.id)}
      >
        参拝
      </button>
      <button
        className="px-2 py-1 bg-green-500 text-white rounded"
        onClick={() => remoteMutation.mutate(shrine.id)}
      >
        遥拝
      </button>
    </div>
  );
}
