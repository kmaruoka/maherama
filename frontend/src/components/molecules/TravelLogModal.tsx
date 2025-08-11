import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';
import { useToast } from '../atoms';
import { CustomButton } from '../atoms/CustomButton';

interface TravelLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
  title: string;
  isLoading?: boolean;
}

export function TravelLogModal({ isOpen, onClose, onSubmit, title, isLoading = false }: TravelLogModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      showToast(t('pleaseEnterContent'), 'error');
      return;
    }

    if (content.length > 1000) {
      showToast(t('contentTooLong'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
      onClose();
    } catch (error) {
      console.error('旅の記録投稿エラー:', error);
      // エラー時のToast表示は親コンポーネントで行うため、ここでは表示しない
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setContent('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="travel-log-content">{t('travelLogContent')}</label>
            <textarea
              id="travel-log-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('travelLogPlaceholder')}
              maxLength={1000}
              rows={6}
              disabled={isSubmitting || isLoading}
              className="form-control"
            />
            <div className="form-text">
              {content.length}/1000 {t('characters')}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <CustomButton
            onClick={handleClose}
            disabled={isSubmitting || isLoading}
            style={{ marginRight: '8px' }}
          >
            {t('cancel')}
          </CustomButton>
          <CustomButton
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting || isLoading}
            color="#28a745"
            hoverColor="#218838"
            disabledColor="#b1dfbb"
          >
            {isSubmitting ? t('posting') : t('post')}
          </CustomButton>
        </div>
      </div>
    </div>
  );
}
