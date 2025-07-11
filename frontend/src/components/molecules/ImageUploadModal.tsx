import React, { useState } from 'react';
import Cropper from 'react-easy-crop';
import { useSkin } from '../../skins/SkinContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (dataUrl: string) => Promise<void>;
}

export default function ImageUploadModal({ isOpen, onClose, onUpload }: Props) {
  const { skin } = useSkin();
  const [imageSrc, setImageSrc] = useState<string>();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropped, setCropped] = useState<any>(null);

  if (!isOpen) return null;

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const createImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

  const getCroppedImg = async () => {
    if (!imageSrc || !cropped) return null;
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = cropped.width;
    canvas.height = cropped.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(
      image,
      cropped.x,
      cropped.y,
      cropped.width,
      cropped.height,
      0,
      0,
      cropped.width,
      cropped.height
    );
    return canvas.toDataURL('image/jpeg');
  };

  const handleSubmit = async () => {
    const dataUrl = await getCroppedImg();
    if (!dataUrl) return;
    await onUpload(dataUrl);
    onClose();
    setImageSrc(undefined);
  };

  return (
    <div
      className="modal fade show"
      style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div
          className="modal-content"
          style={{ background: skin.colors.surface, color: skin.colors.text }}
        >
          <div className="modal-header" style={{ borderBottom: `1px solid ${skin.colors.border}` }}>
            <h5 className="modal-title">画像アップロード</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {!imageSrc && <input type="file" accept="image/*" onChange={onFileChange} />}
            {imageSrc && (
              <div style={{ position: 'relative', width: '100%', height: '300px' }}>
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedAreaPixels) => setCropped(croppedAreaPixels)}
                />
              </div>
            )}
          </div>
          <div className="modal-footer" style={{ borderTop: `1px solid ${skin.colors.border}` }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>キャンセル</button>
            {imageSrc && (
              <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                アップロード
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
