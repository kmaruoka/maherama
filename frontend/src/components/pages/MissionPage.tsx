import React, { useCallback } from 'react';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { useEvents } from '../../hooks/useEvents';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { useMissions } from '../../hooks/useMissions';
import { useSkin } from '../../skins/SkinContext';
import GridCardContainer from '../atoms/GridCardContainer';
import PageLayout from '../atoms/PageLayout';
import MissionGridCard from '../molecules/MissionGridCard';
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
    <PageLayout>
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
        <GridCardContainer
          items={permanentMissions}
          renderItem={(mission) => (
            <MissionGridCard
              key={mission.id}
              mission={mission}
              onClick={() => handleMissionClick(mission)}
            />
          )}
          cardWidth={114}
          cardHeight={200}
          gap={4}
          emptyMessage="常設ミッションがありません"
        />
      )}

      {tab === 'event' && (
        <GridCardContainer
          items={eventMissions}
          renderItem={(mission) => (
            <MissionGridCard
              key={mission.id}
              mission={mission}
              onClick={() => handleMissionClick(mission)}
            />
          )}
          cardWidth={114}
          cardHeight={200}
          gap={4}
          emptyMessage="限定ミッションがありません"
        />
      )}
    </PageLayout>
  );
};

export default MissionPage;
