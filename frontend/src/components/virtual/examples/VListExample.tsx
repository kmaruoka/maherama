import React from 'react';
import { VirtualThemeProvider, VList } from '../index';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

const users: User[] = Array.from({ length: 10000 }).map((_, i) => ({
  id: i + 1,
  name: `ユーザー ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: i % 3 === 0 ? '管理者' : i % 2 === 0 ? '編集者' : '閲覧者',
}));

export default function VListExample() {
  return (
    <VirtualThemeProvider tokens={{
      'v-row-height': 48,
      'v-font-size': '14px',
    }}>
      <div style={{ height: '80vh', padding: 16 }}>
        <VList
          items={users}
          sizeMode={{ mode: 'fixed', itemSize: 48 }}
          rowRenderer={(user, index, isSelected) => (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '0 16px',
              width: '100%',
              gap: '16px'
            }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {user.id}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{user.name}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{user.email}</div>
              </div>
              <div style={{ 
                padding: '4px 8px', 
                borderRadius: '4px', 
                background: user.role === '管理者' ? '#fef3c7' : user.role === '編集者' ? '#dbeafe' : '#f3f4f6',
                fontSize: '12px',
                color: user.role === '管理者' ? '#92400e' : user.role === '編集者' ? '#1e40af' : '#374151'
              }}>
                {user.role}
              </div>
            </div>
          )}
          itemKey={(user: User) => user.id}
          selected={{ isSelected: (user: User) => user.id % 5 === 0 }}
        />
      </div>
    </VirtualThemeProvider>
  );
} 