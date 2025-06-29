import { useParams } from 'react-router-dom';

export default function DietyPage() {
  const { id } = useParams();
  return (
    <div className="p-4">
      {id} の神情報ページは準備中です。
    </div>
  );
}
