import { Button, Card, Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaChevronCircleLeft } from 'react-icons/fa';
import { useSkin } from '../../skins/SkinContext';
import './CommonPage.css';

interface TermsPageProps {
  onBack?: () => void;
}

export default function TermsPage({ onBack }: TermsPageProps) {
  const { t } = useTranslation();
  useSkin();

  return (
    <div className="common-page">
      {onBack && (
        <Button
          variant="outline-secondary"
          onClick={onBack}
          className="common-page__back-button"
        >
          <FaChevronCircleLeft size={24} />
        </Button>
      )}
      <Container>
        <Card className="common-page__card">
          <Card.Body className="common-page__content">
            <h1 className="common-page__title">利用規約</h1>

            <div className="common-page__section">
              <p className="common-page__intro">
                この利用規約（以下「本規約」）は、Webアプリ「神JOURNEY」（以下「本サービス」）の利用条件を定めるものです。本サービスを利用するすべてのユーザーは、本規約に同意したものとみなされます。
              </p>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">第1条（適用）</h2>
              <p>本規約は、本サービスの利用に関する一切の関係に適用されます。当事業者は必要に応じて本規約を変更できるものとし、変更後の規約は本サービス上に表示した時点から効力を生じます。</p>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">第2条（利用登録）</h2>
              <p>本サービスは、利用登録を行わなくても一部機能を利用できますが、登録を行うことで追加機能や保存機能が利用可能となります。</p>
              <ul>
                <li>登録に際して虚偽の情報を提供してはなりません。</li>
                <li>登録情報に変更があった場合、速やかに当事業者に通知してください。</li>
              </ul>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">第3条（禁止事項）</h2>
              <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
              <ul>
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為またはその助長</li>
                <li>宗教的、政治的、差別的または過度に過激な表現の投稿</li>
                <li>他のユーザー、第三者または当事業者の知的財産権、肖像権、プライバシーを侵害する行為</li>
                <li>本サービスの運営を妨害する行為（過度なアクセス、位置情報の不正改ざん、BOT・スクリプトによる操作等）</li>
                <li>他のユーザーになりすます行為</li>
                <li>本サービスの利用権を第三者に譲渡または貸与する行為</li>
              </ul>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">第4条（課金サービス）</h2>
              <p>本サービスには有料のサブスクリプションサービスがあります。</p>
              <ul>
                <li>サブスクリプションの内容、料金、支払方法は「特定商取引法に基づく表記」に記載します。</li>
                <li>ユーザーの都合による契約期間途中の解約・返金は行いません。</li>
              </ul>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">第5条（投稿コンテンツ）</h2>
              <ul>
                <li>ユーザーが本サービスを通じて投稿した文章、画像等（以下「投稿コンテンツ」）の著作権はユーザーに帰属します。</li>
                <li>ユーザーは当事業者に対し、投稿コンテンツを本サービス内外で利用・編集・表示する権利を無償かつ非独占的に許諾するものとします。</li>
                <li>投稿コンテンツについて、当事業者は事前の通知なく削除できるものとします。</li>
              </ul>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">第6条（位置情報の利用）</h2>
              <ul>
                <li>本サービスは、位置情報を利用します。</li>
                <li>位置情報の精度や正確性は端末や環境により変動し、必ずしも正確であることを保証しません。</li>
                <li>ユーザーは、位置情報の利用に同意した上で本サービスを利用するものとします。</li>
              </ul>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">第7条（免責事項）</h2>
              <ul>
                <li>当事業者は、本サービスに事実上または法律上の瑕疵がないことを保証しません。</li>
                <li>当事業者は、本サービスの利用により生じたあらゆる損害について、当事業者の故意または重過失による場合を除き、一切の責任を負いません。</li>
                <li>当事業者は、位置情報の誤差、通信障害、サーバー障害、自然災害、外部サービスの停止等により発生した損害について責任を負いません。</li>
                <li>ユーザー間または第三者との間に発生したトラブルについて、当事業者は一切の責任を負いません。</li>
              </ul>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">第8条（サービスの停止・終了）</h2>
              <p>当事業者は、以下の場合に事前通知なく本サービスの全部または一部を停止・終了できるものとします。</p>
              <ul>
                <li>システム保守点検や更新を行う場合</li>
                <li>天災地変、停電、通信障害等により提供が困難な場合</li>
                <li>運営上または技術上の理由で提供が困難と判断した場合</li>
              </ul>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">第9条（利用制限）</h2>
              <p>当事業者は、ユーザーが本規約に違反した場合、事前通知なく利用停止や登録抹消を行うことができます。</p>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">第10条（準拠法・管轄）</h2>
              <p>本規約の解釈は日本法に準拠します。本サービスに関して紛争が生じた場合は、当事業者の所在地を管轄する裁判所を第一審の専属的合意管轄とします。</p>
            </div>

            <div className="common-page__section">
              <p className="common-page__effective-date">
                この利用規約は、2025年1月1日から施行します。
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
