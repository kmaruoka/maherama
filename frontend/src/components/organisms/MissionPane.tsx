import React from 'react';
import { useTranslation } from 'react-i18next';
import { CompletionBadge, RewardIcon } from '../atoms';
import CustomLink from '../atoms/CustomLink';

interface MissionPaneProps {
  mission: any;
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
}

const MissionPane: React.FC<MissionPaneProps> = ({
  mission,
  onShowShrine,
  onShowDiety
}) => {
  const { t } = useTranslation();

  const progressPercentage = mission.total_required > 0 
    ? Math.min((mission.progress / mission.total_required) * 100, 100) 
    : 0;

  return (
    <>
      {/* 進行状況 */}
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

      {/* 対象 */}
      {((mission.shrines && mission.shrines.length > 0) || (mission.dieties && mission.dieties.length > 0)) && (
        <div className="modal-section">
          <div className="modal-subtitle">{t('missionTarget')}</div>
          <div>
            {mission.shrines && mission.shrines.length > 0 && (
              <div>
                <div className="small" style={{ marginBottom: '5px', color: 'var(--color-text)', opacity: 0.7 }}>神社</div>
                <div className="d-flex flex-wrap gap-2">
                  {mission.shrines.map((shrine: any) => (
                    <div
                      key={`shrine-${shrine.id}`}
                      style={{
                        position: 'relative',
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
                <div className="small" style={{ marginBottom: '5px', color: 'var(--color-text)', opacity: 0.7 }}>神様</div>
                <div className="d-flex flex-wrap gap-2">
                  {mission.dieties.map((diety: any) => (
                    <div
                      key={`diety-${diety.id}`}
                      style={{
                        position: 'relative',
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
      )}

      {/* 報酬 */}
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

      {/* 期間（イベントミッションのみ） */}
      {mission.mission_type === 'event' && mission.start_at && mission.end_at && (
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
      )}
    </>
  );
};

export default MissionPane; 