import React, { useState, useCallback } from 'react';
import { useMissions } from '../../hooks/useMissions';
import { useEvents } from '../../hooks/useEvents';
import { useSkin } from '../../skins/SkinContext';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import MissionCard from '../molecules/MissionCard';
import CardGrid from '../atoms/CardGrid';
import PageLayout from '../atoms/PageLayout';
import './MissionPage.css';

interface MissionPageProps {
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
  onShowMission?: (id: number) => void;
}

const MissionPage: React.FC<MissionPageProps> = ({ onShowShrine, onShowDiety, onShowMission }) => {
  const { data: missions = [], isLoading: missionsLoading, error: missionsError } = useMissions();
  const { events, loading: eventsLoading, error: eventsError } = useEvents();
  const { skin } = useSkin();
  const [tab, setTab] = useLocalStorageState<'permanent' | 'event'>('missionTab', 'permanent');

  const handleMissionClick = useCallback((mission: any) => {
    if (onShowMission) {
      onShowMission(mission.id);
    }
  }, [onShowMission]);

  if (missionsLoading || eventsLoading) {
    return (
      <PageLayout>
        <div className="mission-page__loading">読み込み中...</div>
      </PageLayout>
    );
  }

  if (missionsError || eventsError) {
    return (
      <PageLayout>
        <div className="mission-page__error">
          {missionsError?.message || eventsError}
        </div>
      </PageLayout>
    );
  }

  const permanentMissions = missions.filter(m => m.mission_type === 'permanent');
  const eventMissions = missions.filter(m => m.mission_type === 'event');

  return (
    <PageLayout style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Tabs
        id="mission-tabs"
        activeKey={tab}
        onSelect={k => k && setTab(k as 'permanent' | 'event')}
        className="mb-2"
      >
        <Tab eventKey="permanent" title="常設ミッション" />
        <Tab eventKey="event" title="限定ミッション" />
      </Tabs>

        {tab === 'permanent' && (
          <CardGrid
            items={permanentMissions}
            renderItem={(mission) => (
              <MissionCard 
                key={mission.id} 
                mission={mission} 
                onClick={() => handleMissionClick(mission)} 
              />
            )}
            cardWidth={114}
            cardHeight={200}
            gap={4}
            emptyMessage="常設ミッションがありません"
            style={{ flex: 1, minHeight: 0 }}
          />
        )}

        {tab === 'event' && (
          <CardGrid
            items={eventMissions}
            renderItem={(mission) => (
              <MissionCard 
                key={mission.id} 
                mission={mission} 
                onClick={() => handleMissionClick(mission)} 
              />
            )}
            cardWidth={114}
            cardHeight={200}
            gap={4}
            emptyMessage="限定ミッションがありません"
            style={{ flex: 1, minHeight: 0 }}
          />
        )}
    </PageLayout>
  );
};

export default MissionPage; 