// Tüm tiplerin merkezi export noktası

export * from './user';
export * from './recommendation';
export * from './comment';

// Ek tipler
export type Category = {
  id: string;
  name: string;
  order?: number;
};

export type Notification = {
  id: string;
  type: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
  };
  linkPath: '/(tabs)/notifications' | '/recommendation/[id]';
  linkParams: Record<string, string>;
  imageUrl: string | null;
  message: string;
  commentText?: string;
  createdAt: any;
  isRead: boolean;
};

