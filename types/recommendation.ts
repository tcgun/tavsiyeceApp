// Tavsiye ile ilgili tipler

import { User } from './user';

export type Recommendation = {
  id: string;
  category: string;
  title: string;
  text: string;
  userId: string;
  image: string | null;
  rating: number | null;
  createdAt?: any;
  keywords?: string[];
  title_lowercase?: string;
  source?: string;
};

export type RecommendationSnippet = {
  id: string;
  title: string;
  category: string;
  image: string | null;
};

export type RecommendationCardData = {
  id: string;
  category: string;
  title: string;
  text: string;
  user: {
    name: string;
    avatar: string;
  };
  userId: string;
  image: string | null;
  isLiked: boolean;
  likeCount?: number;
  commentCount?: number;
  createdAt?: any;
};

export type RecommendationResult = {
  id: string;
  title: string;
  category: string;
  image: string | null;
};

export type TrendingItem = {
  id: string;
  title: string;
  description: string;
  image: string | null;
};

