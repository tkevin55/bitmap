import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Settings, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConversionSettings, DEFAULT_SETTINGS } from '../../../shared/types';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { downloadFile, formatFileSize } from '../lib/utils';

const Editor: React.FC = () => {
  const { user } = useAuth();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS);
  const [processing, setProcessing] = useState(false);
  const [outputData, setOutputData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isPro = user?.isPro || false;

  // File drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setOutputData(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    maxSize: isPro ? 50 * 1024 * 1024 : 10 * 1024 * 1024,
  });

  // Draw pixelated preview on canvas
  useEffect(() => {
    if (!previewUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Calculate dimensions
      const maxWidth = 600;
      const maxHeight = 400;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw pixelated preview
      const pixelSize = settings.pixelSize;
      const w = Math.floor(width / pixelSize);
      const h = Math.floor(height / pixelSize);

      // Draw scaled down
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, w, h);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Apply threshold for B&W mode
      if (settings.mode === 'bw') {
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const value = gray >= settings.threshold ? 255 : 0;
          data[i] = value;
          data[i + 1] = value;
          data[i + 2] = value;
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // Scale up to show pixels
      ctx.drawImage(canvas, 0, 0, w, h, 0, 0, width, height);
    };
    img.src = previewUrl;
  }, [previewUrl, settings.pixelSize, settings.threshold, settings.mode]);

  // Handle conversion
  const handleConvert = async (format: 'svg' | 'png' | 'jpg') => {
    if (!uploadedFile) {
      toast.error('Please upload an image first');
      return;
    }

    if (settings.mode === 'color' && !isPro) {
      toast.error('Color mode requires PRO subscription');
      return;
    }

    setProcessing(true);

    try {
      const response = await api.convertImage(uploadedFile, {
        settings,
        format,
      });

      if (response.fileData) {
        setOutputData(response.fileData);
        toast.success(`Converted to ${format.toUpperCase()}!`);
      } else if (response.downloadUrl) {
        // Download from server
        window.open(response.downloadUrl, '_blank');
        toast.success('Download started!');
      }

      // Update user credits
      if (user && !isPro) {
        toast.success(`${response.creditsRemaining} credits remaining`);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Conversion failed';
      toast.error(message);

      if (error.response?.data?.code === 'PRO_REQUIRED') {
        // Redirect to pricing
        setTimeout(() => {
          window.location.href = '/pricing';
        }, 2000);
      }
    } finally {
      setProcessing(false);
    }
  };

  // Download output
  const handleDownload = () => {
    if (!outputData) return;

    const ext = outputData.startsWith('data:image/svg') ? 'svg' : 'png';
    downloadFile(outputData, `pixelated-${Date.now()}.${ext}`);
    toast.success('Downloaded!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Bitmap Pixelator</h1>
          <p className="text-gray-600">
            Transform your images into pixelated vector graphics
          </p>
          {user && (
            <p className="mt-2 text-sm text-gray-500">
              {isPro ? (
                <span className="text-primary-600 font-semibold">PRO</span>
              ) : (
                <span>{user.credits} credits remaining</span>
              )}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Upload & Preview */}
          <div className="space-y-4">
            {/* Upload Area */}
            {!uploadedFile ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {isDragActive ? 'Drop your image here' : 'Drop image or click to upload'}
                </p>
                <p className="text-sm text-gray-500">
                  PNG, JPG, WebP • Max {isPro ? '50MB' : '10MB'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setPreviewUrl(null);
                        setOutputData(null);
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">{formatFileSize(uploadedFile.size)}</p>
                </div>

                {/* Canvas Preview */}
                <div className="bg-white rounded-lg p-4 shadow">
                  <h3 className="font-medium text-gray-900 mb-2">Preview</h3>
                  <canvas
                    ref={canvasRef}
                    className="w-full border border-gray-200 rounded"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Controls */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Settings</h2>
              </div>

              <div className="space-y-6">
                {/* Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSettings({ ...settings, mode: 'bw' })}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        settings.mode === 'bw'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Black & White
                    </button>
                    <button
                      onClick={() => {
                        if (isPro) {
                          setSettings({ ...settings, mode: 'color' });
                        } else {
                          toast.error('Color mode requires PRO subscription');
                        }
                      }}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        settings.mode === 'color'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } ${!isPro && 'opacity-50 cursor-not-allowed'}`}
                    >
                      Color {!isPro && '🔒'}
                    </button>
                  </div>
                </div>

                {/* Pixel Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pixel Size: {settings.pixelSize}px
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={settings.pixelSize}
                    onChange={(e) =>
                      setSettings({ ...settings, pixelSize: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                {/* Threshold (B&W mode) */}
                {settings.mode === 'bw' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Threshold: {settings.threshold}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={settings.threshold}
                      onChange={(e) =>
                        setSettings({ ...settings, threshold: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                )}

                {/* Color Mode Settings */}
                {settings.mode === 'color' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Palette Size: {settings.paletteSize || 16}
                      </label>
                      <input
                        type="range"
                        min="2"
                        max="64"
                        value={settings.paletteSize || 16}
                        onChange={(e) =>
                          setSettings({ ...settings, paletteSize: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dithering
                      </label>
                      <select
                        value={settings.dithering || 'floyd-steinberg'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            dithering: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="none">None</option>
                        <option value="floyd-steinberg">Floyd-Steinberg</option>
                        <option value="atkinson">Atkinson</option>
                        <option value="ordered">Ordered</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Export */}
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex items-center gap-2 mb-4">
                <Download className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Export</h2>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleConvert('svg')}
                  disabled={!uploadedFile || processing}
                  className="py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'SVG'}
                </button>
                <button
                  onClick={() => handleConvert('png')}
                  disabled={!uploadedFile || processing}
                  className="py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'PNG'}
                </button>
                <button
                  onClick={() => handleConvert('jpg')}
                  disabled={!uploadedFile || processing}
                  className="py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'JPG'}
                </button>
              </div>

              {outputData && (
                <button
                  onClick={handleDownload}
                  className="mt-4 w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Download Result
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
