// Yorum ile ilgili tipler

export type Comment = {
  id: string;
  text: string;
  createdAt: any;
  userId: string;
  user: {
    name: string;
    avatar: string;
  };
};

