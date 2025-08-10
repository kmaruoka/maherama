import { Card, Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useSkin } from '../../skins/SkinContext';
import './CommercialTransactionPage.css';

export default function CommercialTransactionPage() {
  const { t } = useTranslation();
  useSkin();

  return (
    <div className="commercial-transaction-page">
      <Container>
        <Card className="commercial-transaction-page__card">
          <Card.Body className="commercial-transaction-page__content">
            <h1 className="commercial-transaction-page__title">特定商取引に基づく表記</h1>

            <div className="commercial-transaction-page__section">
              <h2 className="commercial-transaction-page__section-title">販売事業者</h2>
              <p className="commercial-transaction-page__value">丸岡 浩</p>
            </div>

            <div className="commercial-transaction-page__section">
              <h2 className="commercial-transaction-page__section-title">所在地</h2>
              <p className="commercial-transaction-page__value">大阪府大阪市西区西本町１丁目１１－１１－７０６</p>
            </div>

            <div className="commercial-transaction-page__section">
              <h2 className="commercial-transaction-page__section-title">メールアドレス</h2>
              <p className="commercial-transaction-page__value">k.m.igosso@gmail.com</p>
            </div>

            <div className="commercial-transaction-page__section">
              <h2 className="commercial-transaction-page__section-title">販売価格</h2>
              <p className="commercial-transaction-page__value">月額 1,000円（税込）</p>
            </div>

            <div className="commercial-transaction-page__section">
              <h2 className="commercial-transaction-page__section-title">代金の支払い方法・時期</h2>
              <ul className="commercial-transaction-page__list">
                <li>クレジットカード決済（Stripeを利用）</li>
                <li>初回お申込み時に課金が行われ、以降は毎月自動更新されます。</li>
              </ul>
            </div>

            <div className="commercial-transaction-page__section">
              <h2 className="commercial-transaction-page__section-title">商品代金以外の必要料金</h2>
              <p className="commercial-transaction-page__value">インターネット接続料金、通信料金はお客様の負担となります。</p>
            </div>

            <div className="commercial-transaction-page__section">
              <h2 className="commercial-transaction-page__section-title">サービス提供時期</h2>
              <p className="commercial-transaction-page__value">決済完了後、直ちに以下の特典が1か月間付与されます。</p>
              <ul className="commercial-transaction-page__list">
                <li>遥拝回数 ＋1</li>
                <li>参拝距離 ×2</li>
                <li>自動参拝機能</li>
              </ul>
            </div>

            <div className="commercial-transaction-page__section">
              <h2 className="commercial-transaction-page__section-title">返品・キャンセルについて</h2>
              <p className="commercial-transaction-page__value">商品の性質上、購入後の返品・キャンセルはできません。</p>
            </div>

            <div className="commercial-transaction-page__section">
              <h2 className="commercial-transaction-page__section-title">動作環境</h2>
              <p className="commercial-transaction-page__value">最新の主要ブラウザ（Google Chrome / Microsoft Edge / Safari 等）での利用を推奨します。</p>
            </div>

            <div className="commercial-transaction-page__section">
              <h2 className="commercial-transaction-page__section-title">その他</h2>
              <p className="commercial-transaction-page__value">本サービスは日本国内向けに提供しています。</p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
