import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { FollowUser, UserProfile } from '../../types';
import { normalizeText } from '../../utils/textUtils';

/**
 * Kullanıcı profilini ID'ye göre getirir
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Kullanıcı profili çekme hatası:', error);
    return null;
  }
};

/**
 * Birden fazla kullanıcı profilini ID'lere göre getirir
 */
export const getUserProfiles = async (userIds: string[]): Promise<Map<string, UserProfile>> => {
  const userMap = new Map<string, UserProfile>();
  
  if (userIds.length === 0) return userMap;
  
  try {
    // Firestore'da 'in' operatörü maksimum 10 eleman alır
    const chunks = [];
    for (let i = 0; i < userIds.length; i += 10) {
      chunks.push(userIds.slice(i, i + 10));
    }
    
    for (const chunk of chunks) {
      const usersQuery = query(
        collection(db, 'users'),
        where(documentId(), 'in', chunk)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        userMap.set(doc.id, {
          id: doc.id,
          name: data.name || 'İsimsiz',
          username: data.username || 'kullanici',
          bio: data.bio || '',
          photoURL: data.photoURL || null,
          recommendationsCount: data.recommendationsCount,
          followersCount: data.followersCount,
          followingCount: data.followingCount,
        });
      });
    }
    
    return userMap;
  } catch (error) {
    console.error('Kullanıcı profilleri çekme hatası:', error);
    return userMap;
  }
};

/**
 * Kullanıcının takipçilerini getirir
 */
export const getFollowers = async (
  userId: string,
  limitCount: number = 5
): Promise<FollowUser[]> => {
  try {
    const followersQuery = query(
      collection(db, 'users', userId, 'followers'),
      limit(limitCount)
    );
    const followersSnapshot = await getDocs(followersQuery);
    const followerUserIds = followersSnapshot.docs.map((doc) => doc.id);
    
    if (followerUserIds.length === 0) return [];
    
    const userMap = await getUserProfiles(followerUserIds);
    return followerUserIds
      .map((id) => {
        const user = userMap.get(id);
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.name || '?'}&background=random`,
        };
      })
      .filter((user): user is FollowUser => user !== null);
  } catch (error) {
    console.error('Takipçiler çekme hatası:', error);
    return [];
  }
};

/**
 * Kullanıcının takip ettiklerini getirir
 */
export const getFollowing = async (
  userId: string,
  limitCount: number = 5
): Promise<FollowUser[]> => {
  try {
    const followingQuery = query(
      collection(db, 'users', userId, 'following'),
      limit(limitCount)
    );
    const followingSnapshot = await getDocs(followingQuery);
    const followingUserIds = followingSnapshot.docs.map((doc) => doc.id);
    
    if (followingUserIds.length === 0) return [];
    
    const userMap = await getUserProfiles(followingUserIds);
    return followingUserIds
      .map((id) => {
        const user = userMap.get(id);
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.name || '?'}&background=random`,
        };
      })
      .filter((user): user is FollowUser => user !== null);
  } catch (error) {
    console.error('Takip edilenler çekme hatası:', error);
    return [];
  }
};

/**
 * Kullanıcı adından e-posta adresi bulur
 */
export const getEmailByUsername = async (username: string): Promise<string | null> => {
  try {
    // Türkçe karakterleri normalleştir (kayıt sırasında normalizeText kullanıldığı için)
    const normalizedUsername = normalizeText(username);
    
    const usersQuery = query(
      collection(db, 'users'),
      where('username_lowercase', '==', normalizedUsername)
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      return userData.email || null;
    }
    
    return null;
  } catch (error) {
    console.error('Kullanıcı adından e-posta bulma hatası:', error);
    return null;
  }
};

