import React from 'react';
import { useSkin } from '../../skins/SkinContext';
import { NOIMAGE_USER_URL } from '../../constants';

interface User {
  id: number;
  name: string;
  image_id?: number;
  image_url?: string;
  image_url_xs?: string;
  image_url_s?: string;
  image_url_m?: string;
  image_url_l?: string;
  image_url_xl?: string;
  image_by?: string;
}

interface FollowModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: User[];
  isLoading: boolean;
  error: string | null;
  onUserClick?: (userId: number) => void;
}

export default function FollowModal({
  isOpen,
  onClose,
  title,
  users,
  isLoading,
  error,
  onUserClick
}: FollowModalProps) {
  const { skin } = useSkin();

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show"
      style={{
        display: 'block',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1050
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-content"
          style={{
            background: skin.colors.surface,
            color: skin.colors.text,
            border: `2px solid ${skin.colors.primary}`,
            borderRadius: skin.borderRadius,
            boxShadow: skin.boxShadow,
          }}
        >
          <div
            className="modal-header"
            style={{
              borderBottom: `1px solid ${skin.colors.border}`,
            }}
          >
            <h5
              className="modal-title"
              style={{ color: skin.colors.text }}
            >
              {title}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              style={{
                filter: skin.colors.text === '#ffffff' ? 'invert(1)' : 'none'
              }}
            />
          </div>
          
          <div className="modal-body">
            {isLoading && (
              <div className="text-center py-3">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">読み込み中...</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            
            {!isLoading && !error && users.length === 0 && (
              <div className="text-center py-3 text-muted">
                ユーザーが見つかりません
              </div>
            )}
            
            {!isLoading && !error && users.length > 0 && (
              <div className="list-group list-group-flush">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="list-group-item d-flex align-items-center gap-3 p-3"
                    style={{
                      background: skin.colors.surface,
                      border: `1px solid ${skin.colors.border}`,
                      cursor: onUserClick ? 'pointer' : 'default',
                    }}
                    onClick={() => onUserClick?.(user.id)}
                  >
                    <img
                      src={user.image_url || NOIMAGE_USER_URL}
                      alt={`${user.name}のサムネイル`}
                      className="rounded-circle"
                      style={{
                        width: '3rem',
                        height: '3rem',
                        objectFit: 'contain',
                        border: `2px solid ${skin.colors.primary}`,
                      }}
                    />
                    <div className="flex-grow-1">
                      <h6
                        className="mb-0"
                        style={{ color: skin.colors.text }}
                      >
                        {user.name}
                      </h6>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div
            className="modal-footer"
            style={{
              borderTop: `1px solid ${skin.colors.border}`,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{
                background: skin.colors.accent,
                color: skin.colors.surface,
                border: `2px solid ${skin.colors.accent}`,
                borderRadius: skin.borderRadius,
                fontWeight: 500,
                boxShadow: skin.boxShadow,
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = skin.colors.surface;
                e.currentTarget.style.color = skin.colors.accent;
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = skin.colors.accent;
                e.currentTarget.style.color = skin.colors.surface;
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 