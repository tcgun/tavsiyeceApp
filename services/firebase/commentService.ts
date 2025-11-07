import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Comment } from '../../types';
import { getAvatarUrl } from '../../utils/avatarUtils';
import { formatTime } from '../../utils/dateUtils';
import { getUserProfiles } from './userService';

/**
 * Tavsiye için yorumları getirir
 */
export const getComments = async (recommendationId: string): Promise<Comment[]> => {
  try {
    const commentsRef = collection(db, 'recommendations', recommendationId, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));
    const commentsSnapshot = await getDocs(commentsQuery);

    const fetchedCommentsData: any[] = [];
    const commentUserIDs = new Set<string>();
    
    commentsSnapshot.forEach((doc) => {
      const data = doc.data();
      fetchedCommentsData.push({ id: doc.id, ...data });
      if (data.userId) {
        commentUserIDs.add(data.userId);
      }
    });

    // Kullanıcı bilgilerini çek
    const userMap = await getUserProfiles(Array.from(commentUserIDs));

    // Verileri birleştir
    const finalComments: Comment[] = fetchedCommentsData.map((comment) => {
      const userInfo = userMap.get(comment.userId);
      let finalName = 'Bilinmeyen Kullanıcı';
      if (userInfo) {
        if (userInfo.name) {
          finalName = userInfo.name;
        } else if (userInfo.username && userInfo.username !== 'bilinmeyen') {
          finalName = `@${userInfo.username}`;
        }
      }
      const avatar = getAvatarUrl(userInfo?.name, userInfo?.username);

      let createdAtString = formatTime(comment.createdAt);

      return {
        id: comment.id,
        text: comment.text || '',
        createdAt: createdAtString,
        userId: comment.userId,
        user: { name: finalName, avatar: avatar },
      };
    });

    return finalComments;
  } catch (error) {
    console.error('Yorumlar çekme hatası:', error);
    return [];
  }
};

/**
 * Yeni yorum ekler
 */
export const addComment = async (
  recommendationId: string,
  userId: string,
  text: string
): Promise<string | null> => {
  try {
    const commentData = {
      text: text.trim(),
      userId: userId,
      createdAt: serverTimestamp(),
    };

    const commentsRef = collection(db, 'recommendations', recommendationId, 'comments');
    const docRef = await addDoc(commentsRef, commentData);
    return docRef.id;
  } catch (error) {
    console.error('Yorum ekleme hatası:', error);
    return null;
  }
};

/**
 * Yorum yanıtı ekler
 */
export const addReply = async (
  recommendationId: string,
  commentId: string,
  userId: string,
  text: string
): Promise<string | null> => {
  try {
    const replyData = {
      text: text.trim(),
      userId: userId,
      createdAt: serverTimestamp(),
    };

    const repliesRef = collection(db, 'recommendations', recommendationId, 'comments', commentId, 'replies');
    const docRef = await addDoc(repliesRef, replyData);
    return docRef.id;
  } catch (error) {
    console.error('Yorum yanıtı ekleme hatası:', error);
    return null;
  }
};

/**
 * Yorumu beğenir
 */
export const likeComment = async (
  recommendationId: string,
  commentId: string,
  userId: string
): Promise<boolean> => {
  try {
    const likeRef = doc(db, 'recommendations', recommendationId, 'comments', commentId, 'likes', userId);
    await setDoc(likeRef, {
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Yorum beğenme hatası:', error);
    return false;
  }
};

/**
 * Yorumun beğenilmesini kaldırır
 */
export const unlikeComment = async (
  recommendationId: string,
  commentId: string,
  userId: string
): Promise<boolean> => {
  try {
    const likeRef = doc(db, 'recommendations', recommendationId, 'comments', commentId, 'likes', userId);
    await deleteDoc(likeRef);
    return true;
  } catch (error) {
    console.error('Yorum beğenme kaldırma hatası:', error);
    return false;
  }
};

/**
 * Yorumun beğenilme durumunu kontrol eder
 */
export const isCommentLiked = async (
  recommendationId: string,
  commentId: string,
  userId: string
): Promise<boolean> => {
  try {
    const likeRef = doc(db, 'recommendations', recommendationId, 'comments', commentId, 'likes', userId);
    const likeSnap = await getDoc(likeRef);
    return likeSnap.exists();
  } catch (error) {
    console.error('Yorum beğenme durumu kontrol hatası:', error);
    return false;
  }
};

/**
 * Yorumun beğeni sayısını getirir
 */
export const getCommentLikeCount = async (
  recommendationId: string,
  commentId: string
): Promise<number> => {
  try {
    const likesRef = collection(db, 'recommendations', recommendationId, 'comments', commentId, 'likes');
    const likesSnapshot = await getDocs(likesRef);
    return likesSnapshot.size;
  } catch (error) {
    console.error('Yorum beğeni sayısı çekme hatası:', error);
    return 0;
  }
};

/**
 * Yorumu siler
 */
export const deleteComment = async (
  recommendationId: string,
  commentId: string
): Promise<boolean> => {
  try {
    const commentRef = doc(db, 'recommendations', recommendationId, 'comments', commentId);
    await deleteDoc(commentRef);
    return true;
  } catch (error) {
    console.error('Yorum silme hatası:', error);
    return false;
  }
};

