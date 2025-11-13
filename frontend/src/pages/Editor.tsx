import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Settings, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConversionSettings, DEFAULT_SETTINGS, DitheringMethod } from '../../../shared/types';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { downloadFile, formatFileSize } from '../lib/utils';

const DITHERING_OPTIONS: { value: DitheringMethod; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'floyd-steinberg', label: 'Floyd-Steinberg' },
  { value: 'atkinson', label: 'Atkinson' },
  { value: 'jarvis-judice-ninke', label: 'Jarvis-Judice-Ninke' },
  { value: 'stucki', label: 'Stucki' },
  { value: 'bayer-2x2', label: 'Bayer 2×2' },
  { value: 'bayer-4x4', label: 'Bayer 4×4' },
  { value: 'bayer-8x8', label: 'Bayer 8×8' },
  { value: 'clustered-4x4', label: 'Clustered 4×4' },
  { value: 'random', label: 'Random' },
];

const Editor: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS);
  const [processing, setProcessing] = useState(false);
  const [outputData, setOutputData] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'svg' | 'png' | 'jpg'>('svg');
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    maxSize: 50 * 1024 * 1024, // 50MB for everyone
  });

  // Draw pixelated preview on canvas with real-time updates
  useEffect(() => {
    if (!previewUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Calculate preview dimensions
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

      // Calculate grid dimensions based on size setting
      const shorterSide = Math.min(img.width, img.height);
      const longerSide = Math.max(img.width, img.height);
      const aspectRatio = longerSide / shorterSide;

      let gridWidth: number, gridHeight: number;
      if (img.width <= img.height) {
        gridWidth = settings.size;
        gridHeight = Math.round(settings.size * aspectRatio);
      } else {
        gridWidth = Math.round(settings.size * aspectRatio);
        gridHeight = settings.size;
      }

      // Draw pixelated preview
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, gridWidth, gridHeight);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, gridWidth, gridHeight);
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
      ctx.drawImage(canvas, 0, 0, gridWidth, gridHeight, 0, 0, width, height);
    };
    img.src = previewUrl;
  }, [previewUrl, settings.size, settings.threshold, settings.mode, settings.dithering, settings.paletteSize, settings.blur]);

  // Handle conversion
  const handleConvert = async () => {
    if (!uploadedFile) {
      toast.error('Please upload an image first');
      return;
    }

    setProcessing(true);

    try {
      const maxDimension = 10000; // Maximum resolution for everyone
      const response = await api.convertImage(uploadedFile, {
        settings,
        format: exportFormat,
        maxWidth: maxDimension,
      });

      console.log('Conversion response:', response);

      if (response.fileData) {
        setOutputData(response.fileData);
        toast.success(`Converted to ${exportFormat.toUpperCase()}! Click "Download Result" to save.`);
      } else if (response.downloadUrl) {
        // For larger files, download from server
        const fullUrl = response.downloadUrl.startsWith('http')
          ? response.downloadUrl
          : `${window.location.origin}${response.downloadUrl}`;
        window.open(fullUrl, '_blank');
        toast.success('Download started!');
      } else {
        toast.error('No file data or download URL received');
      }

      // Refresh user if authenticated
      if (user) {
        await refreshUser();
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      const message = error.response?.data?.message || 'Conversion failed';
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  // Download output
  const handleDownload = () => {
    if (!outputData) {
      toast.error('No output data available');
      return;
    }

    try {
      const ext = exportFormat; // Use the selected export format
      downloadFile(outputData, `pixelated-${Date.now()}.${ext}`);
      toast.success('Downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
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
              <span className="text-primary-600 font-semibold">All features unlocked</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Upload & Preview (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
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
                  PNG, JPG, WebP • Max 50MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(uploadedFile.size)}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setPreviewUrl(null);
                        setOutputData(null);
                      }}
                      className="text-sm text-red-600 hover:text-red-700 px-3 py-1 rounded border border-red-300 hover:border-red-400"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Canvas Preview */}
                <div className="bg-white rounded-lg p-4 shadow">
                  <h3 className="font-medium text-gray-900 mb-3">Preview</h3>
                  <div className="flex items-center justify-center bg-gray-100 rounded p-4">
                    <canvas
                      ref={canvasRef}
                      className="max-w-full h-auto"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Controls (1/3 width) */}
          <div className="space-y-4">
            {/* Settings Panel */}
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Settings</h2>
              </div>

              <div className="space-y-6">
                {/* Mode Toggle */}
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
                      onClick={() => setSettings({ ...settings, mode: 'color' })}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        settings.mode === 'color'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Color
                    </button>
                  </div>
                </div>

                {/* Size Slider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size: {settings.size} blocks
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={settings.size}
                    onChange={(e) =>
                      setSettings({ ...settings, size: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Blocks per shorter side</p>
                </div>

                {/* Dithering (both modes) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dithering
                  </label>
                  <select
                    value={settings.dithering || 'floyd-steinberg'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dithering: e.target.value as DitheringMethod,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {DITHERING_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                    <p className="text-xs text-gray-500 mt-1">Dark vs light pixel balance</p>
                  </div>
                )}

                {/* Color Mode Settings */}
                {settings.mode === 'color' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Palette Size: {settings.paletteSize || 16} colors
                      </label>
                      <input
                        type="range"
                        min="2"
                        max="256"
                        value={settings.paletteSize || 16}
                        onChange={(e) =>
                          setSettings({ ...settings, paletteSize: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blur: {settings.blur || 0}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={settings.blur || 0}
                        onChange={(e) =>
                          setSettings({ ...settings, blur: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">Smoothing before processing</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Export Panel */}
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex items-center gap-2 mb-4">
                <Download className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Export</h2>
              </div>

              <div className="space-y-4">
                {/* Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['svg', 'png', 'jpg'] as const).map((format) => (
                      <button
                        key={format}
                        onClick={() => setExportFormat(format)}
                        className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                          exportFormat === format
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Convert Button */}
                <button
                  onClick={handleConvert}
                  disabled={!uploadedFile || processing}
                  className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Convert to {exportFormat.toUpperCase()}
                    </>
                  )}
                </button>

                {/* Download Button */}
                {outputData && (
                  <button
                    onClick={handleDownload}
                    className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download Result
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
