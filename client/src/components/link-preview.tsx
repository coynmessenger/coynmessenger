import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";

interface LinkMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

interface LinkPreviewProps {
  url: string;
  className?: string;
}

const urlCache = new Map<string, LinkMetadata | null>();

export default function LinkPreview({ url, className = "" }: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      // Check cache first
      if (urlCache.has(url)) {
        const cached = urlCache.get(url);
        setMetadata(cached || null);
        setLoading(false);
        setError(!cached);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch");
        }
        
        const data = await response.json();
        urlCache.set(url, data);
        setMetadata(data);
        setError(false);
      } catch (err) {
        urlCache.set(url, null);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  if (loading) {
    return (
      <div className={`mt-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 p-3 animate-pulse ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-slate-600 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-3/4" />
            <div className="h-2 bg-gray-200 dark:bg-slate-600 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !metadata || (!metadata.title && !metadata.description)) {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 block rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 overflow-hidden hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${className}`}
    >
      {metadata.image && (
        <div className="w-full h-32 overflow-hidden">
          <img
            src={metadata.image}
            alt={metadata.title || "Link preview"}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start space-x-2">
          {metadata.favicon && !metadata.image && (
            <img
              src={metadata.favicon}
              alt=""
              className="w-5 h-5 rounded flex-shrink-0 mt-0.5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            {metadata.title && (
              <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                {metadata.title}
              </p>
            )}
            {metadata.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                {metadata.description}
              </p>
            )}
            <div className="flex items-center space-x-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
              <ExternalLink className="w-3 h-3" />
              <span className="truncate">{metadata.siteName || new URL(url).hostname}</span>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}

// Utility function to extract URLs from text
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  const matches = text.match(urlRegex);
  return matches ? Array.from(new Set(matches)) : [];
}
