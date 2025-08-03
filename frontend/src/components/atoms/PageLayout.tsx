import React from 'react';
import { useSkin } from '../../skins/SkinContext';
import './PageLayout.css';

export interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  className = '', 
  style 
}) => {
  const { skin } = useSkin();

  return (
    <div 
      className={`page-layout page-layout--${skin} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default PageLayout; 