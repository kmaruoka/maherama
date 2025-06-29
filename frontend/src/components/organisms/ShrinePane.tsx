import { useMutation, useQueryClient } from '@tanstack/react-query';
import CustomText from '../atoms/CustomText';

export interface Shrine {
  id: number;
  name: string;
  lat: number;
  lng: number;
  count: number;
  registeredAt: string;
}

export default function ShrinePane({ shrine, refetchLogs }: { shrine: Shrine; refetchLogs: () => void; }) {
  const queryClient = useQueryClient();
  const prayMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:3001/shrines/${id}/pray`, {
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
      const res = await fetch(`http://localhost:3001/shrines/${id}/remote-pray`, {
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
      <CustomText>{shrine.name}</CustomText>
      <CustomText>参拝数: {shrine.count}</CustomText>
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
