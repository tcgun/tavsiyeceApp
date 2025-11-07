import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * Tavsiyeyi beğen
 */
export const likeRecommendation = async (userId: string, recommendationId: string) => {
  try {
    // Parametre kontrolü
    if (!userId || !recommendationId) {
      throw new Error('Kullanıcı ID veya tavsiye ID eksik');
    }
    
    const likeRef = doc(db, 'recommendations', recommendationId, 'likes', userId);
    await setDoc(likeRef, {
      createdAt: serverTimestamp(),
    });
    
    // Kullanıcının beğendikleri listesine de ekle
    const userLikeRef = doc(db, 'users', userId, 'likedRecommendations', recommendationId);
    await setDoc(userLikeRef, {
      createdAt: serverTimestamp(),
    });
    
    return true;
  } catch (error: any) {
    console.error('Beğeni hatası:', error);
    // Daha ayrıntılı hata mesajı
    if (error.code === 'permission-denied' || (error.message && error.message.includes('Missing or insufficient permissions'))) {
      throw new Error('Bu işlemi yapmak için yetkiniz yok. Lütfen uygulama yöneticisiyle iletişime geçin.');
    } else if (error.code === 'not-found') {
      throw new Error('Tavsiye bulunamadı');
    } else {
      throw new Error('Beğeni işlemi başarısız oldu: ' + (error.message || error.code || 'Bilinmeyen hata'));
    }
  }
};

/**
 * Tavsiyenin beğenilmesini kaldır
 */
export const unlikeRecommendation = async (userId: string, recommendationId: string) => {
  try {
    // Parametre kontrolü
    if (!userId || !recommendationId) {
      throw new Error('Kullanıcı ID veya tavsiye ID eksik');
    }
    
    const likeRef = doc(db, 'recommendations', recommendationId, 'likes', userId);
    await deleteDoc(likeRef);
    
    // Kullanıcının beğendikleri listesinden de kaldır
    const userLikeRef = doc(db, 'users', userId, 'likedRecommendations', recommendationId);
    await deleteDoc(userLikeRef);
    
    return true;
  } catch (error: any) {
    console.error('Beğeni kaldırma hatası:', error);
    // Daha ayrıntılı hata mesajı
    if (error.code === 'permission-denied' || (error.message && error.message.includes('Missing or insufficient permissions'))) {
      throw new Error('Bu işlemi yapmak için yetkiniz yok. Lütfen uygulama yöneticisiyle iletişime geçin.');
    } else if (error.code === 'not-found') {
      throw new Error('Tavsiye veya beğeni bulunamadı');
    } else {
      throw new Error('Beğeni kaldırma işlemi başarısız oldu: ' + (error.message || error.code || 'Bilinmeyen hata'));
    }
  }
};

/**
 * Tavsiyeyi kaydet
 */
export const saveRecommendation = async (userId: string, recommendationId: string) => {
  try {
    const savedRef = doc(db, 'users', userId, 'savedRecommendations', recommendationId);
    await setDoc(savedRef, {
      createdAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error('Kaydetme hatası:', error);
    return false;
  }
};

/**
 * Tavsiyenin kaydedilmesini kaldır
 */
export const unsaveRecommendation = async (userId: string, recommendationId: string) => {
  try {
    const savedRef = doc(db, 'users', userId, 'savedRecommendations', recommendationId);
    await deleteDoc(savedRef);
    
    return true;
  } catch (error) {
    console.error('Kaydetme kaldırma hatası:', error);
    return false;
  }
};

/**
 * Kullanıcının beğendiği tavsiyeleri getir
 */
export const getUserLikedRecommendations = async (userId: string) => {
  try {
    const likesQuery = query(collection(db, 'users', userId, 'likedRecommendations'));
    const likesSnapshot = await getDocs(likesQuery);
    return likesSnapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Beğenilen tavsiyeler çekilirken hata oluştu:', error);
    return [];
  }
};

/**
 * Kullanıcının kaydettiği tavsiyeleri getir
 */
export const getUserSavedRecommendations = async (userId: string) => {
  try {
    const savedQuery = query(collection(db, 'users', userId, 'savedRecommendations'));
    const savedSnapshot = await getDocs(savedQuery);
    return savedSnapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Kaydedilen tavsiyeler çekilirken hata oluştu:', error);
    return [];
  }
};

/**
 * Tavsiyenin beğenilme durumunu kontrol et
 */
export const isRecommendationLiked = async (userId: string, recommendationId: string) => {
  try {
    const likeRef = doc(db, 'users', userId, 'likedRecommendations', recommendationId);
    const likeSnap = await getDoc(likeRef);
    return likeSnap.exists();
  } catch (error) {
    console.error('Beğeni durumu kontrol hatası:', error);
    return false;
  }
};

/**
 * Tavsiyenin kaydedilme durumunu kontrol et
 */
export const isRecommendationSaved = async (userId: string, recommendationId: string) => {
  try {
    const savedRef = doc(db, 'users', userId, 'savedRecommendations', recommendationId);
    const savedSnap = await getDoc(savedRef);
    return savedSnap.exists();
  } catch (error) {
    console.error('Kaydetme durumu kontrol hatası:', error);
    return false;
  }
};