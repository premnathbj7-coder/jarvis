import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  Trash2,
  X,
  Play,
  Layers,
  Ratio,
  Palette,
  ExternalLink,
} from 'lucide-react';

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: string;
  createdAt: string;
  isAiGenerated: boolean;
}

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCreated?: (img: GeneratedImage) => void;
}

const STYLE_PRESETS = [
  { id: 'hologram', name: 'Holographic HUD', modifier: 'futuristic cyan holographic blueprint with glowing tech diagrams' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', modifier: 'vibrant cyberpunk neon lighting, volumetric mist, high-tech aesthetics' },
  { id: 'concept', name: 'Sci-Fi Concept Art', modifier: 'cinematic digital concept art, detailed, dramatic lighting, 8k resolution' },
  { id: 'photoreal', name: 'Photorealistic', modifier: 'photorealistic studio lighting, sharp textures, high fidelity' },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square' },
  { id: '16:9', label: '16:9 Cinema' },
  { id: '9:16', label: '9:16 Portrait' },
  { id: '4:3', label: '4:3 Studio' },
];

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  onImageCreated,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0]);
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [activeImage, setActiveImage] = useState<GeneratedImage | null>(null);

  const fetchGallery = async () => {
    try {
      const res = await fetch('/api/tools/images');
      if (res.ok) {
        const data = await res.json();
        setGallery(data);
        if (data.length > 0 && !activeImage) {
          setActiveImage(data[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load gallery:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGallery();
    }
  }, [isOpen]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    const fullPrompt = `${prompt.trim()}, ${selectedStyle.modifier}`;

    try {
      const res = await fetch('/api/tools/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          aspectRatio: selectedRatio,
        }),
      });

      if (res.ok) {
        const newImg: GeneratedImage = await res.json();
        setActiveImage(newImg);
        setPrompt('');
        fetchGallery();
        onImageCreated?.(newImg);
      }
    } catch (err) {
      console.error('Image synthesis failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteImage = async (id: string) => {
    try {
      await fetch(`/api/tools/images/${id}`, { method: 'DELETE' });
      if (activeImage?.id === id) {
        setActiveImage(null);
      }
      fetchGallery();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-[#09121f] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_60px_rgba(0,212,255,0.2)] flex flex-col h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-hud text-lg tracking-wider text-cyan-200">
                Holographic AI Image Synthesis Studio
              </h2>
              <div className="text-[11px] font-mono-hud text-slate-400">
                NEURAL RENDERING MATRIX // TEXT-TO-IMAGE GENERATION
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Body: Left Controls, Right Preview & Gallery */}
        <div className="mt-4 flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden">
          {/* Controls (left col-span-5) */}
          <div className="md:col-span-5 flex flex-col bg-[#060c14] border border-cyan-500/20 rounded-xl p-4 overflow-y-auto">
            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Prompt Input */}
              <div>
                <label className="block text-xs font-mono-hud text-cyan-300 uppercase tracking-wider mb-1.5 font-bold">
                  Visual Prompt Directive
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Arc reactor core radiating blue plasma with orbiting cooling rings..."
                  rows={3}
                  className="w-full bg-[#0a1524] border border-cyan-500/30 rounded-xl p-3 text-xs text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 resize-none font-sans leading-relaxed"
                />
              </div>

              {/* Quick Inspiration Chips */}
              <div>
                <div className="text-[10px] font-mono-hud text-slate-400 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>INSPIRATION PRESETS:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Arc Reactor Blueprint in Cyan',
                    'Cyberpunk Iron Man Helmet',
                    'Orbital Quantum AI Datacenter',
                    'Holographic Earth Defense Shield',
                  ].map((presetText) => (
                    <button
                      type="button"
                      key={presetText}
                      onClick={() => setPrompt(presetText)}
                      className="text-[10px] font-mono-hud bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 px-2 py-0.5 rounded-lg transition-colors text-left"
                    >
                      {presetText}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Selector */}
              <div>
                <label className="block text-xs font-mono-hud text-cyan-300 uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Visual Aesthetic Style</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {STYLE_PRESETS.map((style) => (
                    <button
                      type="button"
                      key={style.id}
                      onClick={() => setSelectedStyle(style)}
                      className={`p-2 rounded-lg border text-left text-xs transition-all ${
                        selectedStyle.id === style.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 font-semibold'
                          : 'bg-[#0a1524] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-xs font-mono-hud text-cyan-300 uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1">
                  <Ratio className="w-3.5 h-3.5" />
                  <span>Aspect Ratio</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      type="button"
                      key={ratio.id}
                      onClick={() => setSelectedRatio(ratio.id)}
                      className={`py-1.5 px-2 rounded-lg border text-center text-xs font-mono-hud transition-all ${
                        selectedRatio === ratio.id
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100 font-bold'
                          : 'bg-[#0a1524] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="w-full py-2.5 bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-500/60 rounded-xl text-cyan-100 text-xs font-hud tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,212,255,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isGenerating ? 'SYNTHESIZING IMAGE FRAME...' : 'GENERATE IMAGE'}</span>
              </button>
            </form>
          </div>

          {/* Viewer & Gallery (right col-span-7) */}
          <div className="md:col-span-7 flex flex-col bg-[#060c14] border border-cyan-500/20 rounded-xl p-4 overflow-hidden">
            {/* Active Image Display */}
            <div className="flex-1 flex flex-col items-center justify-center overflow-hidden bg-[#040810] rounded-xl border border-slate-800 p-2 relative">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3 text-cyan-300 font-hud tracking-widest text-xs">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-2 border-purple-500/20 border-b-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                  </div>
                  <span>SYNTHESIZING PIXELS & NEURAL VECTORS...</span>
                </div>
              ) : activeImage ? (
                <div className="flex flex-col items-center justify-center h-full w-full">
                  <div className="relative max-h-[300px] flex items-center justify-center overflow-hidden rounded-lg">
                    <img
                      src={activeImage.imageUrl}
                      alt={activeImage.prompt}
                      referrerPolicy="no-referrer"
                      className="max-h-[290px] w-auto object-contain rounded-lg border border-cyan-500/30 shadow-[0_0_25px_rgba(0,212,255,0.15)]"
                    />
                  </div>

                  <div className="w-full mt-3 flex items-center justify-between px-2 pt-2 border-t border-slate-800 text-xs">
                    <div className="truncate max-w-[280px]">
                      <div className="font-semibold text-cyan-200 truncate">{activeImage.prompt}</div>
                      <div className="text-[10px] font-mono-hud text-slate-500">
                        {new Date(activeImage.createdAt).toLocaleTimeString()} // {activeImage.aspectRatio}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={activeImage.imageUrl}
                        download={`jarvis-render-${activeImage.id}.png`}
                        className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/50 rounded-xl text-cyan-200 text-xs font-mono-hud flex items-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>DOWNLOAD</span>
                      </a>
                      <button
                        onClick={() => deleteImage(activeImage.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 text-xs font-mono-hud py-10">
                  <ImageIcon className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <div>No image frame selected. Create an image to view in matrix.</div>
                </div>
              )}
            </div>

            {/* Gallery Strip */}
            <div className="mt-3 pt-2.5 border-t border-slate-800">
              <div className="text-[10px] font-mono-hud text-slate-400 mb-2 flex items-center justify-between">
                <span>SYNTHESIZED GALLERY ({gallery.length})</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {gallery.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => setActiveImage(img)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border cursor-pointer transition-all ${
                      activeImage?.id === img.id
                        ? 'border-cyan-400 shadow-[0_0_10px_rgba(0,212,255,0.4)]'
                        : 'border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-600'
                    }`}
                  >
                    <img
                      src={img.imageUrl}
                      alt={img.prompt}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
