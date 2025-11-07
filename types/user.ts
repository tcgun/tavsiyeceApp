// Kullanıcı ile ilgili tipler

export type User = {
  name: string;
  username: string;
  photoURL: string | null;
  bio: string;
};

export type UserProfile = {
  id: string;
  name: string;
  username: string;
  bio: string;
  photoURL: string | null;
  recommendationsCount?: number;
  followersCount?: number;
  followingCount?: number;
  createdAt?: any;
  email?: string;
};

export type FollowUser = {
  id: string;
  name: string;
  username: string;
  avatar: string;
};

export type FeaturedUser = {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  isFollowing: boolean;
};

export type UserResult = {
  id: string;
  name: string;
  username: string;
  avatar: string;
};

