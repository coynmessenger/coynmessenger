import fetch from 'node-fetch';

export interface GifData {
  id: string;
  title: string;
  url: string;
  preview_url: string;
  width: number;
  height: number;
  size: number;
}

export interface GifSearchResponse {
  gifs: GifData[];
  hasMore: boolean;
  offset: number;
}

export class GifService {
  private static readonly TENOR_API_KEY = process.env.TENOR_API_KEY || 'AIzaSyCyxuFx2b2Gm-s-OUA2aAx1IXFGE8tnXjM'; // Default demo key
  private static readonly TENOR_BASE_URL = 'https://tenor.googleapis.com/v2';
  
  // Trending GIFs categories for Telegram-like experience
  private static readonly TRENDING_CATEGORIES = [
    'trending',
    'reaction',
    'happy',
    'sad', 
    'love',
    'angry',
    'excited',
    'surprised',
    'crying',
    'laughing',
    'dancing',
    'celebrate'
  ];

  static async searchGifs(
    query: string = 'trending',
    limit: number = 20,
    pos: number = 0
  ): Promise<GifSearchResponse> {
    try {
      const endpoint = query === 'trending' ? 'featured' : 'search';
      const params = new URLSearchParams({
        key: this.TENOR_API_KEY,
        limit: limit.toString(),
        pos: pos.toString(),
        contentfilter: 'medium',
        media_filter: 'gif,tinygif',
        ar_range: 'all'
      });

      if (query !== 'trending') {
        params.append('q', query);
      }

      const response = await fetch(`${this.TENOR_BASE_URL}/${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Tenor API error: ${response.status}`);
      }

      const data = await response.json() as any;
      
      const gifs: GifData[] = (data.results || []).map((result: any) => ({
        id: result.id,
        title: result.content_description || result.h1_title || 'GIF',
        url: result.media_formats?.gif?.url || result.media_formats?.tinygif?.url,
        preview_url: result.media_formats?.tinygif?.url || result.media_formats?.gif?.url,
        width: result.media_formats?.gif?.dims?.[0] || 200,
        height: result.media_formats?.gif?.dims?.[1] || 200,
        size: result.media_formats?.gif?.size || 0
      })).filter((gif: GifData) => gif.url); // Only include GIFs with valid URLs

      return {
        gifs,
        hasMore: data.next && data.next !== '0',
        offset: pos + gifs.length
      };
    } catch (error) {
      console.error('GIF search error:', error);
      
      // Fallback to curated GIFs if API fails
      return this.getFallbackGifs(query, limit, pos);
    }
  }

  static async getTrendingCategories(): Promise<string[]> {
    return this.TRENDING_CATEGORIES;
  }

  static async getGifsByCategory(
    category: string,
    limit: number = 20,
    pos: number = 0
  ): Promise<GifSearchResponse> {
    return this.searchGifs(category, limit, pos);
  }

  // Fallback GIFs when API is unavailable
  private static getFallbackGifs(query: string, limit: number, pos: number): GifSearchResponse {
    const fallbackGifs: Record<string, GifData[]> = {
      trending: [
        {
          id: 'fallback-1',
          title: 'Happy Dance',
          url: 'https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif',
          preview_url: 'https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/200w.gif',
          width: 480,
          height: 270,
          size: 2400000
        },
        {
          id: 'fallback-2',
          title: 'Thumbs Up',
          url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
          preview_url: 'https://media.giphy.com/media/111ebonMs90YLu/200w.gif',
          width: 500,
          height: 375,
          size: 1800000
        },
        {
          id: 'fallback-3',
          title: 'Celebration',
          url: 'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif',
          preview_url: 'https://media.giphy.com/media/26tn33aiTi1jkl6H6/200w.gif',
          width: 480,
          height: 360,
          size: 3200000
        }
      ],
      reaction: [
        {
          id: 'fallback-4',
          title: 'Mind Blown',
          url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
          preview_url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/200w.gif',
          width: 480,
          height: 270,
          size: 2100000
        }
      ]
    };

    const categoryGifs = fallbackGifs[query.toLowerCase()] || fallbackGifs.trending;
    const startIndex = pos;
    const endIndex = Math.min(startIndex + limit, categoryGifs.length);
    
    return {
      gifs: categoryGifs.slice(startIndex, endIndex),
      hasMore: endIndex < categoryGifs.length,
      offset: endIndex
    };
  }

  // Register GIF usage for analytics (Tenor requirement)
  static async registerGifView(gifId: string): Promise<void> {
    try {
      const params = new URLSearchParams({
        key: this.TENOR_API_KEY,
        id: gifId,
        ts: Date.now().toString()
      });

      await fetch(`${this.TENOR_BASE_URL}/registershare?${params}`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Failed to register GIF view:', error);
      // Non-critical error, continue silently
    }
  }
}