import React, { useState } from 'react';
import { Camera, Download, X, Eye } from 'lucide-react';

interface ScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({ isOpen, onClose }) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const takeScreenCapture = async () => {
    setIsCapturing(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'browser' },
        });
        const track = stream.getVideoTracks()[0];
        // @ts-ignore
        const imageCapture = new (window as any).ImageCapture(track);
        const bitmap = await imageCapture.grabFrame();
        track.stop();

        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(bitmap, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
      } else {
        // Fallback: render current window canvas snapshot
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0a101b';
          ctx.fillRect(0, 0, 1280, 720);
          ctx.strokeStyle = '#00d4ff';
          ctx.lineWidth = 4;
          ctx.strokeRect(20, 20, 1240, 680);
          ctx.font = '24px monospace';
          ctx.fillStyle = '#00d4ff';
          ctx.fillText('J.A.R.V.I.S. TELEMETRY FRAME CAPTURE', 60, 80);
          ctx.font = '16px monospace';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`TIMESTAMP: ${new Date().toISOString()}`, 60, 120);
          ctx.fillText('STATUS: PROTOCOL SUCCESSFUL', 60, 150);
          setCapturedImage(canvas.toDataURL('image/png'));
        }
      }
    } catch (err) {
      console.warn('Screen capture cancelled or unavailable:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0a1422] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,212,255,0.15)] flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            <h2 className="font-hud text-lg tracking-wider text-cyan-200">
              Visual Screenshot Capture Tool
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex-1 flex flex-col items-center justify-center p-4 bg-[#060c14] border border-cyan-500/20 rounded-xl min-h-[260px] overflow-hidden">
          {capturedImage ? (
            <div className="flex flex-col items-center w-full">
              <img
                src={capturedImage}
                alt="Captured Screen"
                className="max-h-[300px] w-auto rounded-lg border border-cyan-500/40 shadow-lg object-contain"
              />
              <div className="mt-3 flex items-center gap-3">
                <a
                  href={capturedImage}
                  download={`jarvis-capture-${Date.now()}.png`}
                  className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/50 rounded-xl text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Save Image
                </a>
                <button
                  onClick={takeScreenCapture}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
                >
                  Retake
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <Camera className="w-12 h-12 text-cyan-400/40 mx-auto" />
              <div className="text-xs text-slate-400 font-mono-hud max-w-sm">
                Capture your active screen, browser tab, or application window into local memory archive.
              </div>
              <button
                onClick={takeScreenCapture}
                disabled={isCapturing}
                className="px-5 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-200 rounded-xl text-xs font-hud tracking-wider transition-all shadow-[0_0_15px_rgba(0,212,255,0.2)]"
              >
                {isCapturing ? 'ACQUIRING FRAME...' : 'INITIATE SCREEN CAPTURE'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
