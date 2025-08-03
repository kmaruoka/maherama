import React, { useState, useRef, useCallback } from 'react';
import { FaCamera, FaFolder, FaCheck, FaTimes } from 'react-icons/fa';
import ReactCrop from 'react-image-crop';
import type { Crop } from 'react-image-crop';
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
      alert('カメラが利用できません。ストレージから選択してください。');
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
    
    const initialCrop = {
      unit: '%' as const,
      width: widthPercent,
      height: heightPercent,
      x: xPercent,
      y: yPercent
    };
    
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
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

      // 完了cropを使う（nullの場合は現在のcropを使用）
      const c = completedCrop || crop;
      
      // パーセント値を実際のピクセル値に変換
      const cropX = (c.x ?? 0) * img.naturalWidth / 100;
      const cropY = (c.y ?? 0) * img.naturalHeight / 100;
      const cropW = (c.width ?? 80) * img.naturalWidth / 100;
      const cropH = (c.height ?? 80) * img.naturalHeight / 100;
      
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

      canvas.toBlob(async (blob) => {
        if (blob) {
          const croppedFile = new File([blob], selectedFile.name, { type: 'image/jpeg' });
          await onUpload(croppedFile);
          onClose();
        }
      }, 'image/jpeg');
    } catch (error) {
      console.error('アップロード失敗:', error);
      alert('アップロードに失敗しました。');
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 20,
        maxWidth: 500,
        width: '90%',
        maxHeight: '90%',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3>{title}</h3>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>
            <FaTimes />
          </button>
        </div>

        {step === 'select' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={handleCameraCapture}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  marginBottom: 10,
                  width: '100%',
                  background: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                <FaCamera /> カメラで撮影
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  width: '100%',
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                <FaFolder /> ストレージから選択
              </button>
            </div>
            
            {/* カメラプレビュー */}
            <div style={{ marginBottom: 20 }}>
              <video
                ref={videoRef}
                style={{ width: '100%', maxWidth: 300, display: 'none' }}
                autoPlay
                muted
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <button
                onClick={captureFromCamera}
                style={{
                  padding: '8px 16px',
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'none'
                }}
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
              style={{ display: 'none' }}
            />
          </div>
        )}

        {step === 'crop' && imageSrc && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <p>画像を正方形にトリミングしてください</p>
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
                  const finalCrop = fixedCrop as Crop;
                  setCrop(finalCrop);
                  setCompletedCrop(finalCrop);
                }}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
              >
                <img src={imageSrc} alt="トリミング対象" style={{ maxWidth: '100%' }} onLoad={e => handleImageLoaded(e.currentTarget)} />
              </ReactCrop>
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep('select')}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                戻る
              </button>
              <button
                onClick={handleConfirmCrop}
                disabled={isUploading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  opacity: isUploading ? 0.6 : 1
                }}
              >
                <FaCheck />
                {isUploading ? 'アップロード中...' : '確定'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 