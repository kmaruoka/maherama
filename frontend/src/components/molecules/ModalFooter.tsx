import React from 'react';
import { FaChevronCircleLeft, FaChevronCircleRight } from 'react-icons/fa';
import CustomLink from '../atoms/CustomLink';

interface ModalFooterProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  getPreviousItemName: () => string;
  getNextItemName: () => string;
  getPreviousItemType: () => 'shrine' | 'diety' | 'user' | 'mission' | 'notification';
  getNextItemType: () => 'shrine' | 'diety' | 'user' | 'mission' | 'notification';
}

const ModalFooter: React.FC<ModalFooterProps> = ({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  getPreviousItemName,
  getNextItemName,
  getPreviousItemType,
  getNextItemType
}) => {
  if (!canGoBack && !canGoForward) {
    return null;
  }

  return (
    <div className="modal__footer">
      <div className="modal__navigation">
        <div className="modal__navigation-left">
          {canGoBack && (
            <div className="modal__navigation-item">
              <div className="modal__navigation-arrow">
                <FaChevronCircleLeft size={14} />
              </div>
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
            <div className="modal__navigation-item">
              <CustomLink
                onClick={onGoForward}
                type={getNextItemType()}
              >
                {getNextItemName()}
              </CustomLink>
              <div className="modal__navigation-arrow">
                <FaChevronCircleRight size={14} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalFooter;
