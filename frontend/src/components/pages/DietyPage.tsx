export default function DietyPage({ id, onShowShrine }: { id: number; onShowShrine?: (id: number) => void }) {
  // ダミー神社リスト（本来はAPIで取得）
  const shrineList = [
    { id: 1, name: '天村雲神社' },
    { id: 8, name: '八幡神社' },
  ];
  return (
    <div className="p-4">
      <div className="text-xl font-bold mb-2">{id} の神情報ページは準備中です。</div>
      <div className="font-bold mt-4">祀られている神社</div>
      <ul className="list-disc ml-6">
        {shrineList.map(s => (
          <li key={s.id} className="text-blue-300 underline cursor-pointer" onClick={() => onShowShrine && onShowShrine(s.id)}>{s.name}</li>
        ))}
      </ul>
    </div>
  );
}
