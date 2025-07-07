// Internal GIF collection - no external API required
export interface InternalGif {
  id: string;
  title: string;
  url: string;
  preview: string;
  category: string;
  tags: string[];
  width: number;
  height: number;
}

// Curated collection of popular GIFs (using GIPHY URLs for demonstration)
// In production, these would be hosted internally
export const INTERNAL_GIFS: InternalGif[] = [
  // Trending/Popular
  {
    id: "trending-1",
    title: "Thumbs Up",
    url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    preview: "https://media.giphy.com/media/111ebonMs90YLu/200w.gif",
    category: "trending",
    tags: ["thumbs up", "approval", "yes", "good"],
    width: 480,
    height: 270
  },
  {
    id: "trending-2",
    title: "Clapping",
    url: "https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif",
    preview: "https://media.giphy.com/media/7rj2ZgttvgomY/200w.gif",
    category: "trending",
    tags: ["clapping", "applause", "celebration", "good job"],
    width: 500,
    height: 281
  },
  {
    id: "trending-3",
    title: "Dancing Cat",
    url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
    preview: "https://media.giphy.com/media/JIX9t2j0ZTN9S/200w.gif",
    category: "trending",
    tags: ["cat", "dancing", "funny", "cute"],
    width: 480,
    height: 270
  },
  {
    id: "trending-4",
    title: "High Five",
    url: "https://media.giphy.com/media/gcjmXDPJBQzlu/giphy.gif",
    preview: "https://media.giphy.com/media/gcjmXDPJBQzlu/200w.gif",
    category: "trending",
    tags: ["high five", "celebration", "team", "success"],
    width: 500,
    height: 375
  },
  {
    id: "trending-5",
    title: "Mind Blown",
    url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
    preview: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/200w.gif",
    category: "trending",
    tags: ["mind blown", "wow", "amazing", "surprised"],
    width: 480,
    height: 270
  },

  // Reaction GIFs
  {
    id: "reaction-1",
    title: "Eye Roll",
    url: "https://media.giphy.com/media/Rhhr8D5mKSX7O/giphy.gif",
    preview: "https://media.giphy.com/media/Rhhr8D5mKSX7O/200w.gif",
    category: "reaction",
    tags: ["eye roll", "annoyed", "whatever", "sarcastic"],
    width: 500,
    height: 281
  },
  {
    id: "reaction-2",
    title: "Facepalm",
    url: "https://media.giphy.com/media/XD9o33QG9BoMis7iM4/giphy.gif",
    preview: "https://media.giphy.com/media/XD9o33QG9BoMis7iM4/200w.gif",
    category: "reaction",
    tags: ["facepalm", "disappointed", "frustrated", "fail"],
    width: 480,
    height: 270
  },
  {
    id: "reaction-3",
    title: "Shrug",
    url: "https://media.giphy.com/media/G4ZNYMQVMH6us/giphy.gif",
    preview: "https://media.giphy.com/media/G4ZNYMQVMH6us/200w.gif",
    category: "reaction",
    tags: ["shrug", "idk", "dunno", "whatever"],
    width: 500,
    height: 281
  },
  {
    id: "reaction-4",
    title: "Confused",
    url: "https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif",
    preview: "https://media.giphy.com/media/3o7btPCcdNniyf0ArS/200w.gif",
    category: "reaction",
    tags: ["confused", "what", "huh", "puzzled"],
    width: 480,
    height: 270
  },
  {
    id: "reaction-5",
    title: "Yawn",
    url: "https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif",
    preview: "https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/200w.gif",
    category: "reaction",
    tags: ["yawn", "tired", "bored", "sleepy"],
    width: 480,
    height: 270
  },

  // Happy/Excited
  {
    id: "happy-1",
    title: "Excited Dog",
    url: "https://media.giphy.com/media/rl0FOxdz7CcxO/giphy.gif",
    preview: "https://media.giphy.com/media/rl0FOxdz7CcxO/200w.gif",
    category: "happy",
    tags: ["excited", "dog", "happy", "cute"],
    width: 500,
    height: 375
  },
  {
    id: "happy-2",
    title: "Victory Dance",
    url: "https://media.giphy.com/media/kyLYXonQYYfwYDIeZl/giphy.gif",
    preview: "https://media.giphy.com/media/kyLYXonQYYfwYDIeZl/200w.gif",
    category: "happy",
    tags: ["victory", "dance", "celebration", "win"],
    width: 480,
    height: 270
  },
  {
    id: "happy-3",
    title: "Laughing",
    url: "https://media.giphy.com/media/Q7ozWVYCR0nyW2rvPW/giphy.gif",
    preview: "https://media.giphy.com/media/Q7ozWVYCR0nyW2rvPW/200w.gif",
    category: "happy",
    tags: ["laughing", "funny", "lol", "hilarious"],
    width: 480,
    height: 270
  },
  {
    id: "happy-4",
    title: "Party Time",
    url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    preview: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/200w.gif",
    category: "happy",
    tags: ["party", "celebration", "fun", "dancing"],
    width: 480,
    height: 270
  },
  {
    id: "happy-5",
    title: "Big Smile",
    url: "https://media.giphy.com/media/BPJmthQ3YRwD6QqcVD/giphy.gif",
    preview: "https://media.giphy.com/media/BPJmthQ3YRwD6QqcVD/200w.gif",
    category: "happy",
    tags: ["smile", "happy", "joy", "cheerful"],
    width: 480,
    height: 270
  },

  // Love/Heart
  {
    id: "love-1",
    title: "Heart Eyes",
    url: "https://media.giphy.com/media/B7ppUExX92PjW/giphy.gif",
    preview: "https://media.giphy.com/media/B7ppUExX92PjW/200w.gif",
    category: "love",
    tags: ["heart eyes", "love", "crush", "adore"],
    width: 500,
    height: 281
  },
  {
    id: "love-2",
    title: "Sending Love",
    url: "https://media.giphy.com/media/3o6UB3VhArvomJHtdK/giphy.gif",
    preview: "https://media.giphy.com/media/3o6UB3VhArvomJHtdK/200w.gif",
    category: "love",
    tags: ["sending love", "hearts", "kiss", "affection"],
    width: 480,
    height: 270
  },
  {
    id: "love-3",
    title: "Cute Kiss",
    url: "https://media.giphy.com/media/M90mJvfWfd5mbUuULX/giphy.gif",
    preview: "https://media.giphy.com/media/M90mJvfWfd5mbUuULX/200w.gif",
    category: "love",
    tags: ["kiss", "cute", "love", "sweet"],
    width: 480,
    height: 270
  },
  {
    id: "love-4",
    title: "Hug",
    url: "https://media.giphy.com/media/ZBQhoZC0nqknSviPqT/giphy.gif",
    preview: "https://media.giphy.com/media/ZBQhoZC0nqknSviPqT/200w.gif",
    category: "love",
    tags: ["hug", "comfort", "care", "warm"],
    width: 480,
    height: 270
  },
  {
    id: "love-5",
    title: "Valentine Hearts",
    url: "https://media.giphy.com/media/R6gvnAxj2ISzJdbA63/giphy.gif",
    preview: "https://media.giphy.com/media/R6gvnAxj2ISzJdbA63/200w.gif",
    category: "love",
    tags: ["valentine", "hearts", "romance", "love"],
    width: 480,
    height: 270
  },

  // Sad/Crying
  {
    id: "sad-1",
    title: "Crying",
    url: "https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif",
    preview: "https://media.giphy.com/media/L95W4wv8nnb9K/200w.gif",
    category: "sad",
    tags: ["crying", "sad", "tears", "upset"],
    width: 500,
    height: 281
  },
  {
    id: "sad-2",
    title: "Disappointed",
    url: "https://media.giphy.com/media/ISOckXUybVfQ4/giphy.gif",
    preview: "https://media.giphy.com/media/ISOckXUybVfQ4/200w.gif",
    category: "sad",
    tags: ["disappointed", "sad", "down", "dejected"],
    width: 500,
    height: 281
  },
  {
    id: "sad-3",
    title: "Heartbroken",
    url: "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif",
    preview: "https://media.giphy.com/media/OPU6wzx8JrHna/200w.gif",
    category: "sad",
    tags: ["heartbroken", "sad", "broken heart", "hurt"],
    width: 500,
    height: 281
  },

  // Angry/Mad
  {
    id: "angry-1",
    title: "Angry Face",
    url: "https://media.giphy.com/media/12Nv3nBSCAbLO0/giphy.gif",
    preview: "https://media.giphy.com/media/12Nv3nBSCAbLO0/200w.gif",
    category: "angry",
    tags: ["angry", "mad", "furious", "rage"],
    width: 500,
    height: 281
  },
  {
    id: "angry-2",
    title: "Steam from Ears",
    url: "https://media.giphy.com/media/T7fU0RWWhWpYk/giphy.gif",
    preview: "https://media.giphy.com/media/T7fU0RWWhWpYk/200w.gif",
    category: "angry",
    tags: ["angry", "steam", "mad", "frustrated"],
    width: 500,
    height: 281
  },

  // Funny/LOL
  {
    id: "funny-1",
    title: "Rolling on Floor",
    url: "https://media.giphy.com/media/CoDp6NnSmItoY/giphy.gif",
    preview: "https://media.giphy.com/media/CoDp6NnSmItoY/200w.gif",
    category: "funny",
    tags: ["rofl", "rolling", "funny", "hilarious"],
    width: 500,
    height: 281
  },
  {
    id: "funny-2",
    title: "Belly Laugh",
    url: "https://media.giphy.com/media/1NVugqEPbAUXS/giphy.gif",
    preview: "https://media.giphy.com/media/1NVugqEPbAUXS/200w.gif",
    category: "funny",
    tags: ["laugh", "belly laugh", "funny", "lol"],
    width: 500,
    height: 281
  },

  // Animals
  {
    id: "animal-1",
    title: "Cat Typing",
    url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
    preview: "https://media.giphy.com/media/JIX9t2j0ZTN9S/200w.gif",
    category: "animals",
    tags: ["cat", "typing", "working", "busy"],
    width: 480,
    height: 270
  },
  {
    id: "animal-2",
    title: "Dog Wave",
    url: "https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif",
    preview: "https://media.giphy.com/media/dzaUX7CAG0Ihi/200w.gif",
    category: "animals",
    tags: ["dog", "wave", "hello", "greeting"],
    width: 500,
    height: 281
  },
  {
    id: "animal-3",
    title: "Sleepy Cat",
    url: "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif",
    preview: "https://media.giphy.com/media/MDJ9IbxxvDUQM/200w.gif",
    category: "animals",
    tags: ["cat", "sleepy", "tired", "nap"],
    width: 500,
    height: 281
  },

  // Thank you/Appreciation
  {
    id: "thanks-1",
    title: "Thank You",
    url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
    preview: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200w.gif",
    category: "thanks",
    tags: ["thank you", "thanks", "grateful", "appreciation"],
    width: 480,
    height: 270
  },
  {
    id: "thanks-2",
    title: "Bowing Thank You",
    url: "https://media.giphy.com/media/BcPbK9ci4EU31qUTkR/giphy.gif",
    preview: "https://media.giphy.com/media/BcPbK9ci4EU31qUTkR/200w.gif",
    category: "thanks",
    tags: ["bow", "thank you", "respectful", "grateful"],
    width: 480,
    height: 270
  },

  // Goodbye/Hello
  {
    id: "greeting-1",
    title: "Hello Wave",
    url: "https://media.giphy.com/media/hvRJCLFzcasrR4ia7z/giphy.gif",
    preview: "https://media.giphy.com/media/hvRJCLFzcasrR4ia7z/200w.gif",
    category: "greetings",
    tags: ["hello", "wave", "hi", "greeting"],
    width: 480,
    height: 270
  },
  {
    id: "greeting-2",
    title: "Goodbye",
    url: "https://media.giphy.com/media/Nx0rz3jtxtEre/giphy.gif",
    preview: "https://media.giphy.com/media/Nx0rz3jtxtEre/200w.gif",
    category: "greetings",
    tags: ["goodbye", "bye", "farewell", "see you"],
    width: 500,
    height: 281
  }
];

export class InternalGifService {
  private static gifs = INTERNAL_GIFS;

  static getCategories(): string[] {
    const categories: string[] = [];
    const seen = new Set<string>();
    
    for (const gif of this.gifs) {
      if (!seen.has(gif.category)) {
        seen.add(gif.category);
        categories.push(gif.category);
      }
    }
    
    return ['trending', ...categories.filter(cat => cat !== 'trending')];
  }

  static searchGifs(query: string = '', category: string = '', limit: number = 20, offset: number = 0): {
    gifs: InternalGif[];
    hasMore: boolean;
    total: number;
  } {
    let filteredGifs = this.gifs;

    // Filter by category
    if (category && category !== 'trending') {
      filteredGifs = filteredGifs.filter(gif => gif.category === category);
    } else if (category === 'trending') {
      // For trending, show most popular across all categories
      filteredGifs = this.gifs.filter(gif => gif.category === 'trending');
    }

    // Filter by search query
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      filteredGifs = filteredGifs.filter(gif =>
        gif.title.toLowerCase().includes(searchTerm) ||
        gif.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    const total = filteredGifs.length;
    const startIndex = offset;
    const endIndex = Math.min(startIndex + limit, total);
    const paginatedGifs = filteredGifs.slice(startIndex, endIndex);
    const hasMore = endIndex < total;

    return {
      gifs: paginatedGifs,
      hasMore,
      total
    };
  }

  static getGifById(id: string): InternalGif | undefined {
    return this.gifs.find(gif => gif.id === id);
  }

  static getRandomGifs(count: number = 10): InternalGif[] {
    const shuffled = [...this.gifs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}