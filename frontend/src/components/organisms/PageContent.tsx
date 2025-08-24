import React from 'react';
import CatalogPage from '../pages/CatalogPage';
import CommercialTransactionPage from '../pages/CommercialTransactionPage';
import MapPage from '../pages/MapPage';
import MissionPage from '../pages/MissionPage';
import SettingsPage from '../pages/SettingsPage';
import SubmenuPage from '../pages/SubmenuPage';
import TermsPage from '../pages/TermsPage';
import UserPage from '../pages/UserPage';

type PageType = 'map' | 'catalog' | 'user' | 'settings' | 'submenu' | 'mission' | 'terms' | 'commercial-transaction';

interface PageContentProps {
  page: PageType;
  openModal: (type: "user" | "mission" | "shrine" | "diety" | "notification", id: number, clearHistory?: boolean) => void;
  onNavigateToTerms: () => void;
  onNavigateToCommercialTransaction: () => void;
  onLogout: () => void;
  onBack?: () => void;
}

const PageContent: React.FC<PageContentProps> = ({
  page,
  openModal,
  onNavigateToTerms,
  onNavigateToCommercialTransaction,
  onLogout,
  onBack
}) => {
  const renderPage = () => {
    switch (page) {
      case 'map':
        return (
          <MapPage
            onShowShrine={(id: number) => openModal('shrine', id)}
            onShowUser={(id: number) => openModal('user', id)}
          />
        );
      case 'catalog':
        return (
          <CatalogPage
            onShowShrine={(id: number) => openModal('shrine', id)}
            onShowDiety={(id: number) => openModal('diety', id)}
            onShowUser={(id: number) => openModal('user', id)}
          />
        );
      case 'user':
        return (
          <UserPage
            onShowShrine={(id: number) => openModal('shrine', id)}
            onShowDiety={(id: number) => openModal('diety', id)}
            onShowUser={(id: number) => openModal('user', id)}
          />
        );
      case 'settings':
        return <SettingsPage onLogout={onLogout} />;
      case 'submenu':
        return (
          <SubmenuPage
            onNavigateToTerms={onNavigateToTerms}
            onNavigateToCommercialTransaction={onNavigateToCommercialTransaction}
          />
        );
      case 'mission':
        return (
          <MissionPage
            onShowShrine={(id: number) => openModal('shrine', id)}
            onShowDiety={(id: number) => openModal('diety', id)}
            onShowMission={(id: number) => openModal('mission', id)}
          />
        );
      case 'terms':
        return <TermsPage onBack={onBack} />;
      case 'commercial-transaction':
        return <CommercialTransactionPage onBack={onBack} />;
      default:
        return null;
    }
  };

  return <>{renderPage()}</>;
};

export default PageContent;
