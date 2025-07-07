import { InternalGifService, InternalGif } from './internal-gifs.js';

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
  static async searchGifs(
    query: string = 'trending',
    limit: number = 20,
    pos: number = 0
  ): Promise<GifSearchResponse> {
    try {
      const category = query === 'trending' ? 'trending' : '';
      const searchQuery = query === 'trending' ? '' : query;
      
      const result = InternalGifService.searchGifs(searchQuery, category, limit, pos);
      
      // Convert InternalGif to GifData format
      const gifs: GifData[] = result.gifs.map((gif: InternalGif) => ({
        id: gif.id,
        title: gif.title,
        url: gif.url,
        preview_url: gif.preview,
        width: gif.width,
        height: gif.height,
        size: 2000000 // Default size for all GIFs
      }));

      return {
        gifs,
        hasMore: result.hasMore,
        offset: pos + gifs.length
      };
    } catch (error) {
      console.error('Internal GIF search error:', error);
      
      // Return empty result on error
      return {
        gifs: [],
        hasMore: false,
        offset: pos
      };
    }
  }

  static async getTrendingCategories(): Promise<string[]> {
    return InternalGifService.getCategories();
  }

  static async getGifsByCategory(
    category: string,
    limit: number = 20,
    pos: number = 0
  ): Promise<GifSearchResponse> {
    try {
      const result = InternalGifService.searchGifs('', category, limit, pos);
      
      // Convert InternalGif to GifData format
      const gifs: GifData[] = result.gifs.map((gif: InternalGif) => ({
        id: gif.id,
        title: gif.title,
        url: gif.url,
        preview_url: gif.preview,
        width: gif.width,
        height: gif.height,
        size: 2000000 // Default size for all GIFs
      }));

      return {
        gifs,
        hasMore: result.hasMore,
        offset: pos + gifs.length
      };
    } catch (error) {
      console.error('Category GIF search error:', error);
      
      return {
        gifs: [],
        hasMore: false,
        offset: pos
      };
    }
  }

  // No longer needed for internal GIFs, but keeping for compatibility
  static async registerGifView(gifId: string): Promise<void> {
    // Internal GIFs don't need analytics tracking
    console.log(`GIF viewed: ${gifId}`);
  }
}