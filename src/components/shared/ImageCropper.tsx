"use client";

import { useState } from "react";
import Cropper from "react-easy-crop";
import { X } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  aspect: number;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export default function ImageCropper({
  imageSrc,
  aspect,
  onCropComplete,
  onCancel,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const onCropCompleteHandler = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCrop = async () => {
    try {
      setLoading(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBlob);
    } catch (e) {
      console.error("Failed to crop image", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-3xl w-full max-w-[500px] overflow-hidden flex flex-col h-[500px]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-text-primary text-sm">Crop Image</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-surface-2 rounded-full transition-colors text-text-secondary hover:text-text-primary focus:outline-none scale-active"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Cropper area */}
        <div className="flex-1 relative bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteHandler}
          />
        </div>

        {/* Zoom controls */}
        <div className="p-6 bg-surface space-y-4 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-accent"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-full border border-border px-5 py-2 text-xs font-bold hover:bg-surface-2 scale-active focus:outline-none transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCrop}
              disabled={loading}
              className="rounded-full bg-accent text-invert-text px-5 py-2 text-xs font-bold hover:opacity-90 disabled:opacity-50 scale-active focus:outline-none transition-opacity"
            >
              {loading ? "Cropping..." : "Apply Crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Canvas Cropper helper
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  image.crossOrigin = "anonymous";

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      }
    }, "image/jpeg");
  });
}
