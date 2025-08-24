import { Button, Card, Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaChevronCircleLeft } from 'react-icons/fa';
import { useSkin } from '../../skins/SkinContext';
import PageTitle from '../atoms/PageTitle';
import './CommonPage.css';

interface CommercialTransactionPageProps {
  onBack?: () => void;
}

export default function CommercialTransactionPage({ onBack }: CommercialTransactionPageProps) {
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
            <PageTitle title="特定商取引法に基づく表記" />

            <div className="common-page__section">
              <h2 className="common-page__section-title">販売事業者</h2>
              <p className="common-page__value">丸岡 浩</p>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">所在地</h2>
              <p className="common-page__value">大阪府大阪市西区西本町１丁目１１－１１－７０６</p>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">メールアドレス</h2>
              <p className="common-page__value">k.m.igosso@gmail.com</p>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">販売価格</h2>
              <p className="common-page__value">月額 1,000円（税込）</p>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">代金の支払い方法・時期</h2>
              <ul className="common-page__list">
                <li>クレジットカード決済（Stripeを利用）</li>
                <li>初回お申込み時に課金が行われ、以降は毎月自動更新されます。</li>
              </ul>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">商品代金以外の必要料金</h2>
              <p className="common-page__value">インターネット接続料金、通信料金はお客様の負担となります。</p>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">サービス提供時期</h2>
              <p className="common-page__value">決済完了後、直ちに以下の特典が1か月間付与されます。</p>
              <ul className="common-page__list">
                <li>遥拝回数 ＋1</li>
                <li>参拝距離 ×2</li>
                <li>自動参拝機能</li>
              </ul>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">返品・キャンセルについて</h2>
              <p className="common-page__value">商品の性質上、購入後の返品・キャンセルはできません。</p>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">動作環境</h2>
              <p className="common-page__value">最新の主要ブラウザ（Google Chrome / Microsoft Edge / Safari 等）での利用を推奨します。</p>
            </div>

            <div className="common-page__section">
              <h2 className="common-page__section-title">その他</h2>
              <p className="common-page__value">本サービスは日本国内向けに提供しています。</p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
