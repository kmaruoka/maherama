import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCamera, FaCheck, FaFolder, FaTimes } from 'react-icons/fa';
import type { Crop } from 'react-image-crop';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  title: string;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  title
}) => {
  const [step, setStep] = useState<'select' | 'crop'>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10
  });
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setStep('crop');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('カメラアクセス失敗:', error);
      // カメラアクセスエラーは静かに処理（ユーザーは手動でストレージから選択可能）
    }
  }, []);

  const captureFromCamera = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            handleFileSelect(file);
          }
        }, 'image/jpeg');
      }
      // カメラ停止
      const stream = video.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleCropComplete = (crop: Crop) => {
    setCrop(crop);
  };

  // 画像読み込み時に中央正方形cropに初期化
  const handleImageLoaded = (img: HTMLImageElement) => {
    setImgElement(img);
    const min = Math.min(img.naturalWidth, img.naturalHeight);
    const widthPercent = (min / img.naturalWidth) * 100;
    const heightPercent = (min / img.naturalHeight) * 100;
    const xPercent = ((img.naturalWidth - min) / 2 / img.naturalWidth) * 100;
    const yPercent = ((img.naturalHeight - min) / 2 / img.naturalHeight) * 100;
    setCrop({
      unit: '%',
      width: widthPercent,
      height: heightPercent,
      x: xPercent,
      y: yPercent
    });
    return false; // ReactCrop用
  };

  const handleConfirmCrop = async () => {
    if (!selectedFile || !imageSrc || !imgElement) return;

    setIsUploading(true);
    try {
      // トリミング処理
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = imgElement;

      // 完了cropを使う
      const c = completedCrop || crop;
      // crop値はimgの表示サイズ基準なので、naturalWidth基準に変換
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      let cropX = (c.x ?? 0) * scaleX;
      let cropY = (c.y ?? 0) * scaleY;
      let cropW = (c.width ?? 80) * scaleX;
      let cropH = (c.height ?? 80) * scaleY;
      // 正方形保証
      const size = Math.min(cropW, cropH);
      canvas.width = size;
      canvas.height = size;

      if (ctx) {
        ctx.drawImage(
          img,
          cropX,
          cropY,
          size,
          size,
          0,
          0,
          size,
          size
        );
      }

      // 同期処理でBlobを作成
      const dataURL = canvas.toDataURL('image/jpeg', 0.9);
      const response = await fetch(dataURL);
      const blob = await response.blob();
      const croppedFile = new File([blob], selectedFile.name, { type: 'image/jpeg' });
      await onUpload(croppedFile);
      onClose();
    } catch (error) {
      console.error('アップロード失敗:', error);
      // エラーはapi-toast連携システムで自動的に処理される
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedFile(null);
    setImageSrc('');
    setCrop({ unit: '%', width: 80, height: 80, x: 10, y: 10 });
    setCompletedCrop(null);
    setIsUploading(false);
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="image-upload-modal-overlay" onClick={handleClose}>
      <div className="image-upload-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="image-upload-modal-header">
          <h3>{title}</h3>
          <button onClick={handleClose} className="image-upload-modal-close">
            <FaTimes />
          </button>
        </div>

        <div className="image-upload-modal-body">
          {step === 'select' && (
            <div className="image-upload-select">
              <div className="image-upload-buttons">
                <button
                  onClick={handleCameraCapture}
                  className="image-upload-button image-upload-button--camera"
                >
                  <FaCamera className="image-upload-button__icon" />
                  <span className="image-upload-button__text">カメラで撮影</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="image-upload-button image-upload-button--storage"
                >
                  <FaFolder className="image-upload-button__icon" />
                  <span className="image-upload-button__text">ストレージから選択</span>
                </button>
              </div>

              {/* カメラプレビュー */}
              <div className="camera-preview">
                <video
                  ref={videoRef}
                  className="camera-preview__video"
                  autoPlay
                  muted
                />
                <canvas ref={canvasRef} className="camera-preview__canvas" />
                <button
                  onClick={captureFromCamera}
                  className="camera-preview__capture-btn"
                  id="capture-btn"
                >
                  撮影
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="image-upload-input"
              />
            </div>
          )}

          {step === 'crop' && imageSrc && (
            <div className="image-upload-crop">
              <div className="crop-instruction">
                <p>画像を正方形にトリミングしてください</p>
              </div>

              <div className="crop-container">
                <ReactCrop
                  crop={crop}
                  onChange={(newCrop) => {
                    // 幅・高さが異なる場合は小さい方に合わせて正方形に
                    let fixedCrop = { ...newCrop };
                    if (!fixedCrop.width || !fixedCrop.height) {
                      fixedCrop.width = fixedCrop.height = fixedCrop.width || fixedCrop.height || 80;
                    } else if (fixedCrop.width !== fixedCrop.height) {
                      const min = Math.min(fixedCrop.width, fixedCrop.height);
                      fixedCrop.width = fixedCrop.height = min;
                    }
                    setCrop(fixedCrop as Crop);
                  }}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  className="crop-component"
                >
                  <img
                    src={imageSrc}
                    alt="トリミング対象"
                    className="crop-image"
                    onLoad={e => handleImageLoaded(e.currentTarget)}
                  />
                </ReactCrop>
              </div>

              <div className="crop-actions">
                <button
                  onClick={() => setStep('select')}
                  className="crop-action-button crop-action-button--back"
                >
                  戻る
                </button>
                <button
                  onClick={handleConfirmCrop}
                  disabled={isUploading}
                  className="crop-action-button crop-action-button--confirm"
                >
                  <FaCheck className="crop-action-button__icon" />
                  <span className="crop-action-button__text">
                    {isUploading ? 'アップロード中...' : '確定'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
