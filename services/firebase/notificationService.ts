import {
    collection,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    setDoc,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * Beğeni bildirimi oluşturur
 */
export const createLikeNotification = async (
  recommendationId: string,
  recommendationOwnerId: string,
  likerId: string,
  likerName: string,
  likerAvatar: string,
  recommendationTitle: string,
  recommendationImage: string | null
) => {
  try {
    // Kendi tavsiyesini beğendiğinde bildirim gönderme
    if (recommendationOwnerId === likerId) return;

    const notificationRef = doc(
      collection(db, 'users', recommendationOwnerId, 'notifications')
    );

    await setDoc(notificationRef, {
      type: 'Begeniler',
      senderId: likerId,
      senderName: likerName,
      senderPhotoURL: likerAvatar,
      message: 'tavsiyeni beğendi.',
      link: `/recommendation/${recommendationId}`,
      imageUrl: recommendationImage,
      createdAt: serverTimestamp(),
      isRead: false,
    });
  } catch (error) {
    console.error('Beğeni bildirimi oluşturma hatası:', error);
  }
};

/**
 * Yorum bildirimi oluşturur
 */
export const createCommentNotification = async (
  recommendationId: string,
  recommendationOwnerId: string,
  commenterId: string,
  commenterName: string,
  commenterAvatar: string,
  commentText: string,
  recommendationTitle: string,
  recommendationImage: string | null
) => {
  try {
    // Kendi tavsiyesine yorum yaptığında bildirim gönderme
    if (recommendationOwnerId === commenterId) return;

    const notificationRef = doc(
      collection(db, 'users', recommendationOwnerId, 'notifications')
    );

    await setDoc(notificationRef, {
      type: 'Yorumlar',
      senderId: commenterId,
      senderName: commenterName,
      senderPhotoURL: commenterAvatar,
      message: `tavsiyene yorum yaptı: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
      link: `/recommendation/${recommendationId}`,
      imageUrl: recommendationImage,
      createdAt: serverTimestamp(),
      isRead: false,
    });
  } catch (error) {
    console.error('Yorum bildirimi oluşturma hatası:', error);
  }
};

/**
 * Yorum yanıtı bildirimi oluşturur
 */
export const createReplyNotification = async (
  recommendationId: string,
  parentCommentOwnerId: string,
  replierId: string,
  replierName: string,
  replierAvatar: string,
  replyText: string,
  recommendationTitle: string,
  recommendationImage: string | null
) => {
  try {
    // Kendi yorumuna yanıt verdiğinde bildirim gönderme
    if (parentCommentOwnerId === replierId) return;

    const notificationRef = doc(
      collection(db, 'users', parentCommentOwnerId, 'notifications')
    );

    await setDoc(notificationRef, {
      type: 'Yanitlar',
      senderId: replierId,
      senderName: replierName,
      senderPhotoURL: replierAvatar,
      message: `yorumuna yanıt verdi: "${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}"`,
      link: `/recommendation/${recommendationId}`,
      imageUrl: recommendationImage,
      createdAt: serverTimestamp(),
      isRead: false,
    });
  } catch (error) {
    console.error('Yorum yanıtı bildirimi oluşturma hatası:', error);
  }
};

/**
 * Bildirimi okundu olarak işaretler
 */
export const markNotificationAsRead = async (
  userId: string,
  notificationId: string
) => {
  try {
    const notificationRef = doc(
      db,
      'users',
      userId,
      'notifications',
      notificationId
    );
    
    // Önce bildirimi kontrol et
    const notificationSnap = await getDoc(notificationRef);
    if (notificationSnap.exists()) {
      await setDoc(notificationRef, {
        ...notificationSnap.data(),
        isRead: true
      }, { merge: true });
    }
  } catch (error) {
    console.error('Bildirimi okundu olarak işaretleme hatası:', error);
  }
};

/**
 * Tüm bildirimleri okundu olarak işaretler
 */
export const markAllNotificationsAsRead = async (
  userId: string
) => {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const notificationsSnapshot = await getDocs(notificationsRef);
    
    const batch = writeBatch(db);
    notificationsSnapshot.forEach((doc: any) => {
      batch.update(doc.ref, { isRead: true });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Tüm bildirimleri okundu olarak işaretleme hatası:', error);
  }
};

