import React from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import CustomLink from '../atoms/CustomLink';

interface ModalHeaderProps {
  title: string;
  onBack: () => void;
  onTitleClick?: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  getPreviousItemName: () => string;
  getNextItemName: () => string;
  getPreviousItemType: () => 'shrine' | 'diety' | 'user' | 'mission' | 'notification';
  getNextItemType: () => 'shrine' | 'diety' | 'user' | 'mission' | 'notification';
}

const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  onBack,
  onTitleClick,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  getPreviousItemName,
  getNextItemName,
  getPreviousItemType,
  getNextItemType
}) => {
  return (
    <div className="modal__header">
      <div className="modal__header-content">
        <div className="modal__header-title-container">
          <h3
            onClick={onTitleClick}
            style={{ cursor: onTitleClick ? 'pointer' : 'default' }}
            className={onTitleClick ? 'modal__header-title--clickable' : ''}
          >
            {title}
          </h3>
        </div>
        <div className="modal__navigation">
          <div className="modal__navigation-left">
            {canGoBack && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                <FaArrowLeft size={12} />
                <CustomLink
                  onClick={onGoBack}
                  type={getPreviousItemType()}
                >
                  {getPreviousItemName()}
                </CustomLink>
              </div>
            )}
          </div>
          <div className="modal__navigation-right">
            {canGoForward && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                <CustomLink
                  onClick={onGoForward}
                  type={getNextItemType()}
                >
                  {getNextItemName()}
                </CustomLink>
                <FaArrowRight size={12} />
              </div>
            )}
          </div>
        </div>
      </div>
      <button className="btn-base pane__close-btn" onClick={onBack}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
};

export default ModalHeader;
