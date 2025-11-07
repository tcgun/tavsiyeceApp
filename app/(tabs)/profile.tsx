import { MaterialIcons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Firebase (Authentication ve Firestore)
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

import { COLORS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { isRecommendationSaved, likeRecommendation, saveRecommendation, unlikeRecommendation, unsaveRecommendation } from '../../services/firebase/recommendationService';
import { getFollowers, getFollowing, getUserProfile } from '../../services/firebase/userService';
import { FollowUser, RecommendationCardData, RecommendationSnippet, UserProfile } from '../../types';
import { getAvatarUrlWithFallback } from '../../utils/avatarUtils';
import { formatRelativeTime } from '../../utils/dateUtils';

// --- Alt Bileşenler ---

// RecommendationCard bileşeni (anasayfadaki gibi)
type RecommendationCardProps = {
  item: RecommendationCardData;
  isDark: boolean;
};

const RecommendationCard = ({ item, isDark }: RecommendationCardProps) => {
  const { user: authUser } = useAuth();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(item.isLiked);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likeCount || 0);
  const commentCount = item.commentCount || 0;
  const timeAgo = item.createdAt ? formatRelativeTime(item.createdAt) : '';

  useEffect(() => {
    setLikeCount(item.likeCount || 0);
  }, [item.likeCount]);

  useEffect(() => {
    const checkSaved = async () => {
      if (!authUser?.uid) return;
      try {
        const isSaved = await isRecommendationSaved(authUser.uid, item.id);
        setIsBookmarked(isSaved);
      } catch (error) {
        console.error('Kaydedilme durumu kontrol hatası:', error);
      }
    };
    checkSaved();
  }, [authUser?.uid, item.id]);

  const handleBookmark = async (e: any) => {
    e.stopPropagation();
    if (!authUser?.uid) return;
    
    setIsBookmarked(!isBookmarked);
    try {
      if (isBookmarked) {
        await unsaveRecommendation(authUser.uid, item.id);
      } else {
        await saveRecommendation(authUser.uid, item.id);
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      setIsBookmarked(!isBookmarked);
    }
  };

  const handleLike = async (e: any) => {
    e.stopPropagation();
    if (!authUser?.uid) return;
    
    setIsLiking(true);
    
    try {
      if (isLiked) {
        await unlikeRecommendation(authUser.uid, item.id);
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        await likeRecommendation(authUser.uid, item.id);
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
        
        if (item.userId && item.userId !== authUser.uid) {
          try {
            const currentUserProfile = await getUserProfile(authUser.uid);
            if (currentUserProfile) {
              // Bildirim servisi import edilmeli, şimdilik atlayalım
            }
          } catch (notifError) {
            console.error('Bildirim gönderme hatası:', notifError);
          }
        }
      }
    } catch (error: any) {
      console.error('Beğeni hatası:', error);
      Alert.alert('Hata', error.message || 'Beğeni işlemi başarısız oldu.', [{ text: 'Tamam' }]);
      setIsLiked(!isLiked);
    } finally {
      setIsLiking(false);
    }
  };

  const cardStyle = {
    backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight,
  };
  const textStyle = {
    color: isDark ? COLORS.textDark : COLORS.textLight,
  };
  const mutedTextStyle = {
    color: isDark ? COLORS.mutedDark : COLORS.mutedLight,
  };
  const iconColor = isDark ? COLORS.mutedDark : COLORS.mutedLight;

  // Güvenli kullanıcı bilgisi erişimi
  const userAvatar = item.user?.avatar || getAvatarUrlWithFallback(null, item.user?.name, item.user?.name || 'Kullanıcı');
  const userName = item.user?.name || 'Kullanıcı';

  return (
    <View style={[styles.cardContainer, cardStyle]}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardUserInfo}>
            <Image source={{ uri: userAvatar }} style={styles.cardAvatar} />
            <View style={styles.cardUserText}>
              <Text style={[styles.cardUserName, textStyle]}>{userName}</Text>
              {timeAgo ? (
                <Text style={[styles.cardTimeAgo, mutedTextStyle]}>{timeAgo}</Text>
              ) : null}
            </View>
          </View>
        </View>

        <Text style={[styles.cardText, textStyle]}>
          {item.text}
        </Text>

        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.cardActions}>
          <Pressable
            style={styles.actionButtonVertical}
            onPress={handleLike}
            disabled={isLiking}
          >
            {isLiking ? (
              <ActivityIndicator size="small" color="#BA68C8" />
            ) : (
              <>
                <MaterialIcons
                  name={isLiked ? 'favorite' : 'favorite-border'}
                  size={24}
                  color={isLiked ? '#BA68C8' : iconColor}
                />
                {likeCount > 0 && (
                  <Text style={[styles.actionCountVertical, textStyle]}>{likeCount}</Text>
                )}
              </>
            )}
          </Pressable>

          <Link 
            href={{ 
              pathname: "/recommendation/[id]", 
              params: { id: item.id, focusComment: 'true' } 
            }} 
            asChild
            onPress={(e) => { e.stopPropagation(); }} 
          >
            <Pressable style={styles.actionButtonVertical}>
              <MaterialIcons
                name="chat-bubble-outline"
                size={24}
                color={iconColor} 
              />
              {commentCount > 0 && (
                <Text style={[styles.actionCountVertical, textStyle]}>{commentCount}</Text>
              )}
            </Pressable>
          </Link>

          <View style={styles.rightActions}>
            <Pressable
              style={styles.actionButton}
              onPress={handleBookmark}
            >
              <MaterialIcons
                name={isBookmarked ? 'bookmark' : 'bookmark-border'}
                size={24}
                color={isBookmarked ? '#9575CD' : iconColor}
              />
            </Pressable>

            <Pressable style={styles.actionButton}>
              <MaterialIcons
                name="share"
                size={24}
                color={iconColor}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

// Tavsiye Kartı (Grid için - kaydedilenler kısmında kullanılabilir)
const RecommendationGridItem = ({ item, isDark }: { item: RecommendationSnippet, isDark: boolean }) => {
  const cardStyle = { backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };

  return (
    <Link
        href={{
          pathname: "/recommendation/[id]",
          params: { id: item.id }
        }}
        asChild
      >
      <Pressable style={[styles.gridItem, cardStyle]}>
        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={styles.gridImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.gridContent}>
          <Text style={[styles.gridTitle, textStyle]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.gridCategory, mutedTextStyle]}>{item.category}</Text>
        </View>
      </Pressable>
    </Link>
  );
};



// --- Ana Profil Ekranı ---

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<'recommendations' | 'saved'>('recommendations');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const router = useRouter(); 

  // Dinamik State'ler
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRecommendations, setUserRecommendations] = useState<RecommendationCardData[]>([]);
  const [savedRecommendations, setSavedRecommendations] = useState<RecommendationCardData[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = auth.currentUser?.uid;
  const { user: authUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      if (!currentUserId) {
        setError("Kullanıcı bulunamadı. Lütfen giriş yapın.");
        setIsLoading(false);
        return;
      }

      try {
        // 1. Kullanıcı profilini çek
        const userRef = doc(db, 'users', currentUserId);
        const userSnap = await getDoc(userRef);

        let profileData: UserProfile | null = null;
        if (userSnap.exists()) {
          profileData = { id: userSnap.id, ...userSnap.data() } as UserProfile;
          setUserProfile(profileData);
        } else {
          setError("Profil bilgileri bulunamadı.");
          setIsLoading(false);
          return;
        }

        // 2. Kullanıcının tavsiyelerini çek (tüm tavsiyeler)
        const recQuery = query(
          collection(db, 'recommendations'),
          where('userId', '==', currentUserId),
          orderBy(sortBy === 'latest' ? 'createdAt' : 'likesCount', 'desc')
        );
        const recSnapshot = await getDocs(recQuery);
        
        // Beğeni ve yorum sayılarını batch olarak çek
        const recommendationIds = recSnapshot.docs.map(doc => doc.id);
        const countsMap = new Map<string, { likeCount: number; commentCount: number }>();
        const likedRecommendationIds = new Set<string>();

        if (recommendationIds.length > 0) {
          // Beğeni durumunu kontrol et
          if (authUser?.uid) {
            const likesPromises = recommendationIds.map(async (recId) => {
              const likeRef = doc(db, 'recommendations', recId, 'likes', authUser.uid);
              const likeSnap = await getDoc(likeRef);
              return { recId, isLiked: likeSnap.exists() };
            });
            const likesResults = await Promise.all(likesPromises);
            likesResults.forEach(({ recId, isLiked }) => {
              if (isLiked) likedRecommendationIds.add(recId);
            });

            // Beğeni ve yorum sayılarını çek
            const countPromises = recommendationIds.map(async (recId) => {
              try {
                const [likesSnap, commentsSnap] = await Promise.all([
                  getDocs(collection(db, 'recommendations', recId, 'likes')),
                  getDocs(collection(db, 'recommendations', recId, 'comments'))
                ]);
                return {
                  id: recId,
                  likeCount: likesSnap.size,
                  commentCount: commentsSnap.size
                };
              } catch (error) {
                console.error(`Sayılar çekilirken hata (${recId}):`, error);
                return { id: recId, likeCount: 0, commentCount: 0 };
              }
            });

            const counts = await Promise.all(countPromises);
            counts.forEach(count => {
              countsMap.set(count.id, { likeCount: count.likeCount, commentCount: count.commentCount });
            });
          }
        }

        const fetchedRecs: RecommendationCardData[] = [];
        recSnapshot.forEach((doc) => {
          const data = doc.data();
          const counts = countsMap.get(doc.id) || { likeCount: 0, commentCount: 0 };
          const isLiked = likedRecommendationIds.has(doc.id);
          
          fetchedRecs.push({
            id: doc.id,
            title: data.title || 'Başlıksız',
            text: data.text || '',
            category: data.category || 'Kategori Yok',
            userId: currentUserId || '',
            image: data.image || null,
            user: {
              name: profileData?.name || profileData?.username || 'Kullanıcı',
              avatar: getAvatarUrlWithFallback(profileData?.photoURL, profileData?.name, profileData?.username),
            },
            isLiked: isLiked,
            likeCount: counts.likeCount,
            commentCount: counts.commentCount,
            createdAt: data.createdAt,
          });
        });
        setUserRecommendations(fetchedRecs);
        
        // --- KAYDEDİLENLERİ ÇEK ---
        // Kaydedilen tavsiyeler useEffect ile çekilecek

        // 3. Takipçi ve takip edilen listelerini çek
        const [followersList, followingList] = await Promise.all([
          getFollowers(currentUserId, 10),
          getFollowing(currentUserId, 10),
        ]);
        setFollowers(followersList);
        setFollowing(followingList);
        
      } catch (err: any) {
        console.error("Profil verisi çekme hatası:", err.message);
        setError("Profil yüklenirken bir hata oluştu.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUserId]); 

  // Kaydedilen tavsiyeleri yeniden yükle
  useEffect(() => {
    if (activeTab === 'saved' && savedRecommendations.length === 0 && !loadingSaved) {
      const fetchSavedRecommendations = async () => {
        if (!currentUserId) return;
        
        setLoadingSaved(true);
        try {
          const savedRecsRef = collection(db, 'users', currentUserId, 'savedRecommendations');
          const savedSnap = await getDocs(savedRecsRef);
          const savedIds = savedSnap.docs.map(doc => doc.id);

          if (savedIds.length > 0) {
            const batchSize = 10;
            const fetchedSavedRecs: RecommendationCardData[] = [];
            
            // Paralel sorgularla tüm kaydedilenleri çek
            const promises = [];
            for (let i = 0; i < savedIds.length; i += batchSize) {
              const batch = savedIds.slice(i, i + batchSize);
              const savedRecsQuery = query(
                collection(db, 'recommendations'),
                where(documentId(), 'in', batch)
              );
              promises.push(getDocs(savedRecsQuery));
            }
            
            const snapshots = await Promise.all(promises);
            const allRecs: any[] = [];
            snapshots.forEach(snapshot => {
              snapshot.forEach((doc) => {
                allRecs.push({ id: doc.id, ...doc.data() });
              });
            });

            // Beğeni ve yorum sayılarını batch olarak çek
            const countsMap = new Map<string, { likeCount: number; commentCount: number }>();
            const likedRecommendationIds = new Set<string>();

            if (allRecs.length > 0 && authUser?.uid) {
              // Beğeni durumunu kontrol et
              const likesPromises = allRecs.map(async (rec) => {
                const likeRef = doc(db, 'recommendations', rec.id, 'likes', authUser.uid);
                const likeSnap = await getDoc(likeRef);
                return { recId: rec.id, isLiked: likeSnap.exists() };
              });
              const likesResults = await Promise.all(likesPromises);
              likesResults.forEach(({ recId, isLiked }) => {
                if (isLiked) likedRecommendationIds.add(recId);
              });

              // Beğeni ve yorum sayılarını çek
              const countPromises = allRecs.map(async (rec) => {
                try {
                  const [likesSnap, commentsSnap] = await Promise.all([
                    getDocs(collection(db, 'recommendations', rec.id, 'likes')),
                    getDocs(collection(db, 'recommendations', rec.id, 'comments'))
                  ]);
                  return {
                    id: rec.id,
                    likeCount: likesSnap.size,
                    commentCount: commentsSnap.size
                  };
                } catch (error) {
                  console.error(`Sayılar çekilirken hata (${rec.id}):`, error);
                  return { id: rec.id, likeCount: 0, commentCount: 0 };
                }
              });

              const counts = await Promise.all(countPromises);
              counts.forEach(count => {
                countsMap.set(count.id, { likeCount: count.likeCount, commentCount: count.commentCount });
              });
            }

            // Kullanıcı bilgilerini çek
            const userIds = [...new Set(allRecs.map(rec => rec.userId).filter(Boolean))];
            const userMap = new Map<string, UserProfile>();
            
            await Promise.all(
              userIds.map(async (userId) => {
                try {
                  const userRef = doc(db, 'users', userId);
                  const userSnap = await getDoc(userRef);
                  if (userSnap.exists()) {
                    userMap.set(userId, { id: userSnap.id, ...userSnap.data() } as UserProfile);
                  }
                } catch (error) {
                  console.error(`Kullanıcı bilgisi çekilirken hata (${userId}):`, error);
                }
              })
            );

            // RecommendationCardData formatına dönüştür
            allRecs.forEach((rec) => {
              const counts = countsMap.get(rec.id) || { likeCount: 0, commentCount: 0 };
              const isLiked = likedRecommendationIds.has(rec.id);
              const recUser = rec.userId ? userMap.get(rec.userId) : null;
              
              // Eğer kullanıcı bilgisi yoksa ve userId varsa tekrar çekmeyi dene
              if (!recUser && rec.userId) {
                // Kullanıcı bilgisi bulunamadı, fallback kullan
                fetchedSavedRecs.push({
                  id: rec.id,
                  title: rec.title || 'Başlıksız',
                  text: rec.text || '',
                  category: rec.category || 'Kategori Yok',
                  userId: rec.userId || '',
                  image: rec.image || null,
                  user: {
                    name: 'Kullanıcı',
                    avatar: getAvatarUrlWithFallback(null, 'Kullanıcı', 'Kullanıcı'),
                  },
                  isLiked: isLiked,
                  likeCount: counts.likeCount,
                  commentCount: counts.commentCount,
                  createdAt: rec.createdAt,
                });
              } else {
                fetchedSavedRecs.push({
                  id: rec.id,
                  title: rec.title || 'Başlıksız',
                  text: rec.text || '',
                  category: rec.category || 'Kategori Yok',
                  userId: rec.userId || '',
                  image: rec.image || null,
                  user: {
                    name: recUser?.name || recUser?.username || 'Kullanıcı',
                    avatar: getAvatarUrlWithFallback(recUser?.photoURL, recUser?.name, recUser?.username),
                  },
                  isLiked: isLiked,
                  likeCount: counts.likeCount,
                  commentCount: counts.commentCount,
                  createdAt: rec.createdAt,
                });
              }
            });
            
            setSavedRecommendations(fetchedSavedRecs);
          } else {
            setSavedRecommendations([]);
          }
        } catch (error) {
          console.error('Kaydedilen tavsiyeler yüklenirken hata oluştu:', error);
          setSavedRecommendations([]);
        } finally {
          setLoadingSaved(false);
        }
      };
      
      fetchSavedRecommendations();
    }
  }, [activeTab, currentUserId, authUser?.uid]);

  // Dinamik Stiller
  const containerStyle = { backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  const activeTabBorderStyle = { borderColor: COLORS.primary };
  const inactiveTabStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  const activeTabStyle = { color: COLORS.primary };
  const separatorStyle = { borderColor: isDark ? '#374151' : '#e5e7eb' };


  // Yüklenme veya Hata Durumu
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, containerStyle, styles.fullScreenCenter]}>
         <StatusBar barStyle="light-content" />
         <ActivityIndicator size="large" color={COLORS.primary} />
         <Text style={mutedTextStyle}>Profil yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  if (error || !userProfile || !currentUserId) { 
     return (
      <SafeAreaView style={[styles.safeArea, containerStyle, styles.fullScreenCenter]}>
         <StatusBar barStyle="light-content" />
         <MaterialIcons name="error-outline" size={48} color="red" />
         <Text style={[styles.errorText, { color: 'red' }]}>{error || "Profil bulunamadı."}</Text>
      </SafeAreaView>
    );
  }

  // Profil verilerini al
  const profileImageUrl = userProfile.photoURL;
  const ProfileImagePlaceholder = () => (
    <View style={styles.profileImageContainerSmall}>
       <MaterialIcons name="person" size={40} color={isDark ? COLORS.mutedDark : COLORS.mutedLight} />
    </View>
  );


  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: '',
          headerStyle: { backgroundColor: containerStyle.backgroundColor },
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable 
              onPress={() => router.push('/profile-settings')}
              style={{ paddingRight: 16 }}
            >
              <MaterialIcons name="settings" size={24} color={textStyle.color} />
            </Pressable>
          ),
        }} 
      />

      <ScrollView 
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 100 : 105 }}
      >
        <View style={styles.mainContent}>
          {/* Profil Bilgileri - Yeni Tasarım: Profil resmi solda, bilgiler yanında */}
          <View style={styles.profileHeaderContainerNew}>
            <Pressable onPress={() => router.push('/edit-profile')}>
              <View style={[styles.profileImageWrapperNew, { borderColor: isDark ? COLORS.primary : COLORS.primary }]}>
                {profileImageUrl ? (
                  <Image source={{ uri: profileImageUrl }} style={styles.profileImageNewSmall} />
                ) : (
                  <ProfileImagePlaceholder />
                )}
              </View>
            </Pressable>
            <View style={styles.profileInfoContainer}>
              <View style={styles.profileInfoHeader}>
                <View style={styles.profileInfoText}>
                  <Text style={[styles.profileNameNew, textStyle]}>{userProfile.name || "İsimsiz"}</Text>
                  {userProfile.username && (
                    <Text style={[styles.profileUsername, mutedTextStyle]}>@{userProfile.username}</Text>
                  )}
                </View>
                <Pressable 
                  style={[styles.editButtonNew, { backgroundColor: COLORS.primary }]}
                  onPress={() => router.push('/edit-profile')}
                >
                  <MaterialIcons name="edit" size={18} color="#FFFFFF" />
                  <Text style={styles.editButtonTextNew}>Düzenle</Text>
                </Pressable>
              </View>
              {userProfile.bio && (
                <Text style={[styles.profileBioNew, mutedTextStyle]}>
                  {userProfile.bio}
                </Text>
              )}
            </View>
          </View>

          {/* İstatistikler - Tavsiye ilk sırada */}
          <View style={[styles.statsContainerNew, { backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight }]}>
            <View style={styles.statItemNew}>
              <Text style={[styles.statNumberNew, { color: COLORS.primary }]}>{userProfile.recommendationsCount || userRecommendations.length}</Text>
              <Text style={[styles.statLabelNew, mutedTextStyle]}>Tavsiye</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]} />
            <Pressable 
              style={styles.statItemNew} 
              onPress={() => router.push(`/profile/${currentUserId}/followers`)}
            >
              <Text style={[styles.statNumberNew, { color: COLORS.primary }]}>{userProfile.followersCount || followers.length}</Text>
              <Text style={[styles.statLabelNew, mutedTextStyle]}>Takipçi</Text>
            </Pressable>
            <View style={[styles.statDivider, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]} />
            <Pressable 
              style={styles.statItemNew} 
              onPress={() => router.push(`/profile/${currentUserId}/following`)}
            >
              <Text style={[styles.statNumberNew, { color: COLORS.primary }]}>{userProfile.followingCount || following.length}</Text>
              <Text style={[styles.statLabelNew, mutedTextStyle]}>Takip</Text>
            </Pressable>
          </View>

          {/* Özel Header - Tavsiyeler ve Kaydedilenler sekmeleri */}
          <View style={[styles.headerBar, { backgroundColor: COLORS.backgroundDark }]}>
            <Pressable onPress={() => setActiveTab('recommendations')} style={styles.tabButtonHeader}>
              <Text style={[styles.tabButtonText, activeTab === 'recommendations' && styles.tabButtonTextActive]}>
                Tavsiyeler
              </Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab('saved')} style={styles.tabButtonHeader}>
              <MaterialIcons name="bookmark" size={24} color={activeTab === 'saved' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'} />
            </Pressable>
          </View>
          
          {/* İlerleme çubuğu */}
          <View style={styles.progressBar}>
            <View style={[styles.progressBarFill, { backgroundColor: COLORS.backgroundDark, width: activeTab === 'recommendations' ? '50%' : '50%' }]} />
          </View>

          {/* Sekme İçeriği - RecommendationCard ile */}
          {activeTab === 'recommendations' && (
            <View style={styles.feedContainer}>
              {userRecommendations.length > 0 ? (
                userRecommendations.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      router.push({
                        pathname: "/recommendation/[id]",
                        params: { id: item.id }
                      });
                    }}
                  >
                    <RecommendationCard item={item} isDark={isDark} />
                  </Pressable>
                ))
              ) : (
                <Text style={[mutedTextStyle, { marginTop: 20, textAlign: 'center' }]}>Henüz hiç tavsiye eklenmemiş.</Text>
              )}
            </View>
          )}

          {/* --- KAYDEDİLENLER SEKMESİ İÇERİĞİ --- */}
          {activeTab === 'saved' && (
            <View style={styles.feedContainer}>
              {loadingSaved ? (
                <View style={[styles.fullScreenCenter, { width: '100%' }]}> 
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={mutedTextStyle}>Kaydedilenler yükleniyor...</Text>
                </View>
              ) : savedRecommendations.length > 0 ? (
                savedRecommendations.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      router.push({
                        pathname: "/recommendation/[id]",
                        params: { id: item.id }
                      });
                    }}
                  >
                    <RecommendationCard item={item} isDark={isDark} />
                  </Pressable>
                ))
              ) : (
                <Text style={[mutedTextStyle, { marginTop: 20, textAlign: 'center' }]}>Henüz kaydedilmiş tavsiyen yok.</Text>
              )}
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- StyleSheet ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  fullScreenCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  errorText: { color: 'red', textAlign: 'center' },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  tabButtonHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  feedContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cardContainer: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
  },
  cardUserText: {
    flex: 1,
  },
  cardUserName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardTimeAgo: {
    fontSize: 13,
    marginTop: 2,
  },
  cardText: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 4,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    marginTop: 8,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginLeft: 'auto',
  },
  actionButtonVertical: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  actionButton: {
    padding: 4,
  },
  actionCountVertical: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  progressBar: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBarFill: {
    height: '100%',
  },
  headerTitle: {
    fontSize: 20, // text-xl
    fontWeight: 'bold',
  },
  // Main Content
  mainContent: {
    padding: 16,
  },
  // Profile Info
  profileHeaderContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  profileHeaderContainerNew: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingTop: 8,
    gap: 16,
  },
  profileImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    padding: 4,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  profileImageWrapperNew: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    padding: 3,
    backgroundColor: 'transparent',
  },
  profileInfoContainer: {
    flex: 1,
    gap: 8,
  },
  profileInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  profileInfoText: {
    flex: 1,
  },
  profileImageContainer: { // Placeholder için
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#bfdbfe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageContainerSmall: { // Placeholder için küçük versiyon
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#bfdbfe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageNew: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  profileImageNewSmall: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  profileNameNew: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    marginBottom: 12,
  },
  profileBioNew: {
    textAlign: 'left',
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  editButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  editButtonTextNew: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  // Stats - Modern
  statsContainerNew: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItemNew: {
    flex: 1,
    alignItems: 'center',
  },
  statNumberNew: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabelNew: {
    fontSize: 13,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  // Tabs
  tabContainer: {
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12, // py-3
    alignItems: 'center', // Text center
    borderBottomWidth: 2,
    borderColor: 'transparent', // Default no border
  },
  activeTabBorder: {
    borderColor: COLORS.primary, // border-primary
  },
  tabText: {
    fontWeight: '600', // font-semibold
  },
  // Sort
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
    gap: 16,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  activeSortButton: {
    backgroundColor: COLORS.primary,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  activeSortButtonText: {
    color: '#fff',
  },
  // List Container (Alt alta liste görünümü)
  listContainer: {
    marginTop: 16,
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  listItemImage: {
    width: 120,
    height: 120,
    backgroundColor: '#e0e0e0',
  },
  listItemContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  listItemCategory: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Grid
  gridContainer: {
    flexDirection: 'row', // Grid layout
    flexWrap: 'wrap', // Satır atlama
    justifyContent: 'space-between', // Boşlukları ayarla
    marginTop: 16, // mt-4
    paddingHorizontal: 16, // Kaydedilenler ve Tavsiyeler için padding
  },
  gridItem: {
    width: '48%',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gridImage: {
    width: '100%',
    height: 128,
  },
  gridContent: {
    padding: 12,
  },
  gridTitle: {
    fontWeight: '600',
  },
  gridCategory: {
    fontSize: 14,
    marginTop: 4,
  },
  // Follow List
  followSection: {
    // marginTop handled outside
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  followList: {
    gap: 16,
  },
  followItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  followItemUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMedium: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
    backgroundColor: '#e0e0e0',
  },
  followName: {
    fontWeight: '600',
  },
  followUsername: {
    fontSize: 14,
  },
  followButtonBase: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 110, // Butonların genişliğinin zıplamasını engelle
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff', // Default for follow button
  },
  followButton: {
    backgroundColor: COLORS.primary,
  },
  followingButtonLight: {
    backgroundColor: '#e5e7eb',
  },
  followingButtonDark: {
    backgroundColor: '#374151',
  },
  followingTextLight: {
    color: '#1f2937',
  },
  followingTextDark: {
    color: '#d1d5db',
  },
  unfollowButton: {
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  unfollowButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});