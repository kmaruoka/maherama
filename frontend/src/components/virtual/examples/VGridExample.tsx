import React from 'react';
import { VirtualThemeProvider, VGrid } from '../index';

type Product = {
  id: number;
  name: string;
  image: string;
};

const products: Product[] = Array.from({ length: 1000 }).map((_, i) => ({
  id: i + 1,
  name: `商品 ${i + 1}`,
  image: `https://picsum.photos/seed/${i}/200/150`,
}));

export default function VGridExample() {
  return (
    <VirtualThemeProvider>
      <div style={{ height: '80vh', padding: 16 }}>
        <VGrid
          items={products}
          columnCount={4}
          columnWidth={250}
          rowHeight={220}
          renderCard={(p) => (
            <div
              style={{
                margin: 8,
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: 8,
                background: '#fff',
              }}
            >
              <img src={p.image} alt={p.name} style={{ width: '100%', borderRadius: 4 }} />
              <div style={{ marginTop: 8, fontWeight: 'bold' }}>{p.name}</div>
            </div>
          )}
        />
      </div>
    </VirtualThemeProvider>
  );
}
