import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { getApps, type App } from '@/lib/wk-api';
import { APP_ID } from '@/lib/constants';

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  iconUrl: string;
}

// Convert backend App data to FeatureCard
const appToFeatureCard = (app: App): FeatureCard => {
  return {
    id: String(app.id),
    title: app.name,
    description: app.description,
    iconUrl: app.icon,
  };
};

// Icon component: handle image loading errors
function AppIcon({ iconUrl, alt }: { iconUrl: string; alt: string }) {
  const [iconError, setIconError] = useState(false);

  if (iconError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-200">
        <span className="text-gray-400 text-xs">Icon</span>
      </div>
    );
  }

  return <img src={iconUrl} alt={alt} className="w-full h-full object-cover" onError={() => setIconError(true)} />;
}

export default function ToolsPage() {
  const [features, setFeatures] = useState<FeatureCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApps = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getApps(APP_ID);
        if (result.success && result.data && Array.isArray(result.data)) {
          const featureCards = result.data.map(appToFeatureCard);
          setFeatures(featureCards);
        } else {
          setError(result.error || 'Failed to fetch app list');
        }
      } catch (err) {
        console.error('[Tools] Failed to fetch apps:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch app list');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApps();
  }, []);

  const handleFeatureClick = (downloadUrl: string) => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Contact info - fixed */}
      <div className="flex-shrink-0 p-3 pb-3 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-1 text-xs text-gray-700">
          <span>If you have any ideas and suggestions, please contact us via</span>
          <a href="mailto:help@extensionsfox.com" className="text-blue-600 hover:text-blue-800 hover:underline">
            muepoints@gmail.com
          </a>
          <span>or add my discord account</span>
          <span className="text-blue-600 hover:text-blue-800 hover:underline">diandianv587</span>
          <span>for more support.</span>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 flex-shrink-0">
          <Loader2 size={24} className="animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-600">Loading...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-300 rounded-lg flex-shrink-0 m-3">
          <div className="flex-shrink-0">
            <AlertCircle size={20} className="text-red-600" />
          </div>
          <span className="text-sm font-medium text-red-600">{error}</span>
        </div>
      )}

      {/* Feature card list - scrollable area */}
      {!isLoading && !error && (
        <div className="flex-1 overflow-y-auto min-h-0 p-3">
          <div className="flex flex-col gap-2">
            {features.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No apps found</div>
            ) : (
              features.map((feature) => (
                <div
                  key={feature.id}
                  onClick={() => handleFeatureClick('https://bot.wkeasy.com')}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-100">
                    <AppIcon iconUrl={feature.iconUrl} alt={feature.title} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 mb-0.5 group-hover:text-blue-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-gray-600">{feature.description}</p>
                  </div>

                  {/* Right arrow */}
                  <div className="flex-shrink-0">
                    <ChevronRight
                      size={20}
                      className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
