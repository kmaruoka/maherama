import React, { forwardRef } from 'react';
import { useSkin } from '../../skins/SkinContext';
import CustomLink from '../atoms/CustomLink';
import RewardIcon from '../atoms/RewardIcon';
import { useTranslation } from 'react-i18next';

interface MissionPaneProps {
  mission: any;
  onShowShrine?: (id: number) => void;
  onShowDiety?: (id: number) => void;
}

const MissionPane = forwardRef<{ backToOverview: () => void }, MissionPaneProps>(({ 
  mission, 
  onShowShrine, 
  onShowDiety 
}, ref) => {
  const { skin } = useSkin();
  const { t } = useTranslation();
  
  const progressPercentage = mission.total_required > 0 
    ? Math.min((mission.progress / mission.total_required) * 100, 100) 
    : 0;

  // backToOverviewメソッドをrefに公開
  React.useImperativeHandle(ref, () => ({
    backToOverview: () => {
      // MissionPaneには全体表示に戻る機能がないため、何もしない
    }
  }));

  return (
    <>
      {/* 達成状況 */}
      {mission.is_completed && (
        <div style={{ 
          background: '#27ae60', 
          color: 'white', 
          padding: '8px 12px', 
          borderRadius: '4px', 
          marginBottom: '20px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          {t('missionCompleted')}
        </div>
      )}

      {/* ミッション内容 */}
      <div className="modal-section">
        <div className="modal-subtitle">{t('missionContent')}</div>
        <p style={{ margin: 0, lineHeight: '1.5' }}>{mission.content}</p>
      </div>

      {/* 進捗 */}
      <div className="modal-section">
        <div className="modal-subtitle">{t('missionProgress')}</div>
        <div style={{ 
          width: '100%', 
          height: '8px', 
          background: 'rgba(0, 0, 0, 0.1)', 
          borderRadius: '4px', 
          overflow: 'hidden', 
          marginBottom: '8px' 
        }}>
          <div 
            style={{ 
              height: '100%', 
              borderRadius: '4px', 
              background: skin.colors.primary,
              width: `${progressPercentage}%`,
              transition: 'width 0.3s ease'
            }}
          />
        </div>
        <div style={{ 
          fontSize: '0.9rem', 
          textAlign: 'center', 
          fontWeight: 'bold',
          color: skin.colors.text
        }}>
          {mission.progress} / {mission.total_required}
        </div>
      </div>

      {/* 対象神社・神様 */}
      {(mission.shrines && mission.shrines.length > 0 || mission.dieties && mission.dieties.length > 0) && (
        <div className="modal-section">
          <div className="modal-subtitle">{t('missionTarget')}</div>
          <div>
            {mission.shrines && mission.shrines.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
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
                        <span style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: '#27ae60',
                          color: 'white',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          ✓
                        </span>
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
                        <span style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: '#27ae60',
                          color: 'white',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          ✓
                        </span>
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
});

MissionPane.displayName = 'MissionPane';

export default MissionPane; 