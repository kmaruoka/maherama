import React from 'react';

interface ModalHeaderProps {
  title: string;
  onBack: () => void;
  onTitleClick?: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  onBack,
  onTitleClick
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
      </div>
      <button className="btn-base pane__close-btn" onClick={onBack}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
};

export default ModalHeader;
