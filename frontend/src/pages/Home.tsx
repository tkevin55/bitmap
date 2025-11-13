import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Crown, Code, Download } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Bitmap Pixelator
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform your images into stunning pixelated vector graphics.
            Perfect for designers, artists, and creators.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/editor"
              className="px-8 py-4 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Start Creating
            </Link>
            <Link
              to="/pricing"
              className="px-8 py-4 bg-white text-primary-600 border-2 border-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <Zap className="w-12 h-12 text-primary-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-600">
              Process your images in seconds with our optimized engine.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <Download className="w-12 h-12 text-primary-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Multiple Formats</h3>
            <p className="text-gray-600">
              Export to SVG, PNG, or JPG. Perfect for any use case.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <Code className="w-12 h-12 text-primary-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Vector Output</h3>
            <p className="text-gray-600">
              Get scalable SVG files that look perfect at any size.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <Crown className="w-12 h-12 text-primary-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">PRO Features</h3>
            <p className="text-gray-600">
              Full color mode, advanced dithering, and unlimited exports.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20">
          <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Image</h3>
              <p className="text-gray-600">
                Drop your PNG, JPG, or WebP file into the editor.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Adjust Settings</h3>
              <p className="text-gray-600">
                Fine-tune pixel size, threshold, and color palette.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Export & Download</h3>
              <p className="text-gray-600">
                Download your pixelated masterpiece in your preferred format.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
