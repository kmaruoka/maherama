import React from 'react';
import './PageTitle.css';

interface PageTitleProps {
  title: string;
  className?: string;
}

const PageTitle: React.FC<PageTitleProps> = ({ title, className = '' }) => {
  return (
    <h1 className={`page-title ${className}`}>
      {title}
    </h1>
  );
};

export default PageTitle;
