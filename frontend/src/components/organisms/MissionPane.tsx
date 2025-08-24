import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useRef } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { apiCall } from '../../config/api';
import type { Mission } from '../../hooks/useMissions';
import { CompletionBadge, RewardIcon } from '../atoms';
import CustomLink from '../atoms/CustomLink';

interface MissionPaneProps {
  id: number;
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
  onDataLoaded?: (name: string) => void;
}

export interface MissionPaneRef {
  backToOverview: () => void;
  getTitle: () => string;
}

const MissionPane = React.forwardRef<MissionPaneRef, MissionPaneProps>(({
  id,
  onShowShrine,
  onShowDiety,
  onDataLoaded
}, ref) => {
  const { t } = useTranslation();
  const overviewRef = useRef<HTMLDivElement>(null);

  // ミッションデータを取得
  const { data: missions = [], isLoading, error } = useQuery({
    queryKey: ['missions'],
    queryFn: async (): Promise<Mission[]> => {
      const response = await apiCall(`/missions`);
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });

  const mission = missions.find(m => m.id === id);

  // データ読み込み完了時にタイトルを通知
  useEffect(() => {
    if (mission && onDataLoaded) {
      onDataLoaded(mission.name);
    }
  }, [mission, onDataLoaded]);

  // ref の実装
  React.useImperativeHandle(ref, () => ({
    backToOverview: () => {
      if (overviewRef.current) {
        overviewRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    },
    getTitle: () => mission?.name || 'ミッション'
  }));

  if (isLoading) {
    return (
      <div className="modal__content">
        <div className="padding-20 text-center">
          読み込み中...
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="modal__content">
        <div className="padding-20 text-center text-danger">
          ミッションが見つかりません
        </div>
      </div>
    );
  }

  const progressPercentage = mission.total_required > 0
    ? Math.min((mission.progress / mission.total_required) * 100, 100)
    : 0;

  return (
    <Container fluid>
      <div ref={overviewRef}>
        {/* 進行状況 */}
        <Row className="mb-3">
          <Col xs={12}>
            <div className="modal-section">
              <div className="modal-subtitle">{t('missionProgress')}</div>
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="progress-text">
                  {mission.progress} / {mission.total_required}
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* 対象 */}
        {((mission.shrines && mission.shrines.length > 0) || (mission.dieties && mission.dieties.length > 0)) && (
          <Row className="mb-3">
            <Col xs={12}>
              <div className="modal-section">
                <div className="modal-subtitle">{t('missionTarget')}</div>
                <div>
                  {mission.shrines && mission.shrines.length > 0 && (
                    <div>
                      <div className="small margin-bottom-5 text-white opacity-7">神社</div>
                      <div className="d-flex flex-wrap gap-2">
                        {mission.shrines.map((shrine: any) => (
                          <div
                            key={`shrine-${shrine.id}`}
                            className="position-relative"
                            style={{
                              opacity: shrine.is_completed ? 0.6 : 1
                            }}
                          >
                            <CustomLink
                              onClick={onShowShrine ? () => onShowShrine(shrine.id) : undefined}
                              type="shrine"
                            >
                              {shrine.name} ×{shrine.achieved}/{shrine.count}
                            </CustomLink>
                            {shrine.is_completed && (
                              <CompletionBadge
                                size={20}
                                className="position-absolute"
                                style={{
                                  top: '-8px',
                                  right: '-8px'
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {mission.dieties && mission.dieties.length > 0 && (
                    <div>
                      <div className="small margin-bottom-5 text-white opacity-7">神様</div>
                      <div className="d-flex flex-wrap gap-2">
                        {mission.dieties.map((diety: any) => (
                          <div
                            key={`diety-${diety.id}`}
                            className="position-relative"
                            style={{
                              opacity: diety.is_completed ? 0.6 : 1
                            }}
                          >
                            <CustomLink
                              onClick={onShowDiety ? () => onShowDiety(diety.id) : undefined}
                              type="diety"
                            >
                              {diety.name} ×{diety.achieved}/{diety.count}
                            </CustomLink>
                            {diety.is_completed && (
                              <CompletionBadge
                                size={20}
                                className="position-absolute"
                                style={{
                                  top: '-8px',
                                  right: '-8px'
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        )}

        {/* 報酬 */}
        <Row className="mb-3">
          <Col xs={12}>
            <div className="modal-section">
              <div className="modal-subtitle">{t('missionRewards')}</div>
              <div>
                {mission.exp_reward > 0 && (
                  <div className="modal-item">
                    <RewardIcon type="exp" />
                    <span style={{ fontWeight: '500' }}>{t('experience')} +{mission.exp_reward}</span>
                  </div>
                )}
                {mission.ability_reward && typeof mission.ability_reward === 'object' && Object.keys(mission.ability_reward).length > 0 && (
                  <div className="modal-item">
                    <RewardIcon type="ability" />
                    <span style={{ fontWeight: '500' }}>{t('abilityPoints')} +{Object.values(mission.ability_reward as Record<string, number>).reduce((a, b) => a + b, 0)}</span>
                  </div>
                )}
                {mission.titles && mission.titles.map((title: any) => (
                  <div key={title.id} className="modal-item">
                    <RewardIcon type="title" />
                    <span style={{ fontWeight: '500' }}>{title.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>

        {/* 期間（イベントミッションのみ） */}
        {mission.mission_type === 'event' && mission.start_at && mission.end_at && (
          <Row className="mb-3">
            <Col xs={12}>
              <div className="modal-section">
                <div style={{
                  fontSize: '0.9rem',
                  opacity: 0.7,
                  textAlign: 'center',
                  padding: '10px',
                  background: 'rgba(0, 0, 0, 0.05)',
                  borderRadius: '6px'
                }}>
                  {t('missionPeriod')}: {new Date(mission.start_at).toLocaleDateString()} - {new Date(mission.end_at).toLocaleDateString()}
                </div>
              </div>
            </Col>
          </Row>
        )}
      </div>
    </Container>
  );
});

MissionPane.displayName = 'MissionPane';

export default MissionPane;
