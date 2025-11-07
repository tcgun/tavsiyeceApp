import { MaterialIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Firebase
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
    writeBatch
} from 'firebase/firestore';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebaseConfig';
import { createLikeNotification } from '../../services/firebase/notificationService';
import { isRecommendationSaved, likeRecommendation, saveRecommendation, unlikeRecommendation, unsaveRecommendation } from '../../services/firebase/recommendationService';
import { getFollowing, getUserProfile } from '../../services/firebase/userService';
import { RecommendationCardData } from '../../types';
import { getAvatarUrlWithFallback } from '../../utils/avatarUtils';
import { formatRelativeTime } from '../../utils/dateUtils';

type RecommendationCardProps = {
  item: RecommendationCardData;
  isDark: boolean;
};

// --- BİLEŞENLER ---
const RecommendationCard = ({ item, isDark }: RecommendationCardProps) => { 
  const { user: authUser } = useAuth();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(item.isLiked);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [isFollowingLoading, setIsFollowingLoading] = useState(true);
  const [likeCount, setLikeCount] = useState(item.likeCount || 0);
  const commentCount = item.commentCount || 0;
  const timeAgo = item.createdAt ? formatRelativeTime(item.createdAt) : '';

  // item değiştiğinde likeCount'u güncelle
  useEffect(() => {
    setLikeCount(item.likeCount || 0);
  }, [item.likeCount]);

  useEffect(() => {
    // Kaydedilme durumunu kontrol et
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

  useEffect(() => {
    // Takip durumunu kontrol et
    const checkFollowing = async () => {
      if (!authUser?.uid || !item.userId || item.userId === authUser.uid) {
        setIsFollowingLoading(false);
        return;
      }
      setIsFollowingLoading(true);
      try {
        const followingRef = doc(db, 'users', authUser.uid, 'following', item.userId);
        const followingSnap = await getDoc(followingRef);
        setIsFollowing(followingSnap.exists());
      } catch (error) {
        console.error('Takip durumu kontrol hatası:', error);
        setIsFollowing(false);
      } finally {
        setIsFollowingLoading(false);
      }
    };
    checkFollowing();
  }, [authUser?.uid, item.userId]);

  const handleFollowToggle = async (e: any) => {
    e.stopPropagation();
    if (!authUser?.uid || !item.userId || item.userId === authUser.uid || isFollowingLoading) return;
    
    setIsFollowingLoading(true);
    try {
      const followingRef = doc(db, 'users', authUser.uid, 'following', item.userId);
      const followerRef = doc(db, 'users', item.userId, 'followers', authUser.uid);
      const batch = writeBatch(db);

      if (isFollowing) {
        batch.delete(followingRef);
        batch.delete(followerRef);
        setIsFollowing(false);
      } else {
        batch.set(followingRef, { createdAt: serverTimestamp() });
        batch.set(followerRef, { createdAt: serverTimestamp() });
        setIsFollowing(true);
      }
      await batch.commit();
    } catch (error) {
      console.error('Takip hatası:', error);
    } finally {
      setIsFollowingLoading(false);
    }
  };

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
      setIsBookmarked(!isBookmarked); // Hata durumunda geri al
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
        
        // Bildirim gönder
        if (item.userId && item.userId !== authUser.uid) {
          try {
            const currentUserProfile = await getUserProfile(authUser.uid);
            if (currentUserProfile) {
              await createLikeNotification(
                item.id,
                item.userId,
                authUser.uid,
                currentUserProfile.name || currentUserProfile.username || 'Kullanıcı',
                getAvatarUrlWithFallback(currentUserProfile.photoURL, currentUserProfile.name, currentUserProfile.username),
                item.title,
                item.image
              );
            }
          } catch (notifError) {
            console.error('Bildirim gönderme hatası:', notifError);
          }
        }
      }
    } catch (error: any) {
      console.error('Beğeni hatası:', error);
      // Kullanıcı dostu hata mesajı
      if (error.message && error.message.includes('yetkiniz yok')) {
        Alert.alert(
          'Yetki Hatası',
          'Beğeni işlemi için yetkiniz bulunmuyor. Firebase Security Rules ayarlarını kontrol edin.',
          [{ text: 'Tamam' }]
        );
      } else {
        Alert.alert(
          'Hata',
          error.message || 'Beğeni işlemi başarısız oldu. Lütfen tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
      }
      setIsLiked(!isLiked); // Hata durumunda geri al
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

  // Sadece takip edilmeyen kullanıcılarda takip butonu göster
  // Kontrol tamamlanana kadar butonu gösterme
  const showFollowButton = authUser?.uid && item.userId !== authUser.uid && !isFollowingLoading && isFollowing === false;

  return (
    <View style={[styles.cardContainer, cardStyle]}>
      <View style={styles.cardContent}>
        {/* Kullanıcı Profil Bölümü */}
        <View style={styles.cardHeader}>
          <View style={styles.cardUserInfo}>
            <Pressable 
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
              onPress={() => {
                if (item.userId && authUser?.uid !== item.userId) {
                  router.push({ pathname: '/profile/[id]', params: { id: item.userId } });
                }
              }}
              disabled={!item.userId || authUser?.uid === item.userId}
            >
              <Image source={{ uri: item.user.avatar }} style={styles.cardAvatar} />
              <Text style={[styles.cardUserName, textStyle]}>{item.user.name}</Text>
            </Pressable>
            {timeAgo ? (
              <Text style={[styles.cardTimeAgo, mutedTextStyle]}>{timeAgo}</Text>
            ) : null}
          </View>
          {showFollowButton && (
            <Pressable
              style={[
                styles.followButton,
                isFollowing ? styles.followingButton : { backgroundColor: COLORS.primary }
              ]}
              onPress={handleFollowToggle}
              disabled={isFollowingLoading}
            >
              {isFollowingLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? mutedTextStyle.color : '#FFFFFF'} />
              ) : (
                <Text style={[
                  styles.followButtonText,
                  isFollowing ? mutedTextStyle : { color: '#FFFFFF' }
                ]}>
                  {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
                </Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Metin İçeriği */}
        <Text style={[styles.cardText, textStyle]}>
          {item.text}
        </Text>

        {/* Görsel */}
        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}

        {/* Etkileşim Butonları */}
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

// --- Ana Ekran Bileşeni ---

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { user: authUser } = useAuth();

  const [recommendations, setRecommendations] = useState<RecommendationCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNoFollowing, setHasNoFollowing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecommendations = async () => {
      try {
        if (!refreshing) {
          setIsLoading(true);
        }
        setError(null);
        setHasNoFollowing(false);

        if (!authUser?.uid) {
          setError('Tavsiyeleri görmek için giriş yapmalısınız.');
          setIsLoading(false);
          return;
        }

        // 1. Önce takip edilen kullanıcıları çek
        const followingList = await getFollowing(authUser.uid, 100); // Sınır yok
        const followingIds = new Set(followingList.map(user => user.id));
        
        // Kullanıcının kendi tavsiyelerini de göster - HER ZAMAN kendi ID'sini ekle
        const currentUserId = authUser.uid;
        followingIds.add(currentUserId);

        // 2. Takip edilen kullanıcıların ve kendi tavsiyelerini çek
        // Firestore 'in' operatörü maksimum 10 eleman alır
        const followingIdsArray = Array.from(followingIds);
        let allRecsData: any[] = [];
        
        // Eğer followingIdsArray boşsa (olmamalı ama güvenlik için), sadece kendi tavsiyelerini çek
        if (followingIdsArray.length === 0) {
          const ownRecsQuery = query(
            collection(db, 'recommendations'),
            where('userId', '==', currentUserId),
            orderBy('createdAt', 'desc'),
            limit(20)
          );
          const ownRecsSnapshot = await getDocs(ownRecsQuery);
          ownRecsSnapshot.forEach((doc) => {
            allRecsData.push({ id: doc.id, ...doc.data() });
          });
        } else {
          const batchSize = 10;
          
          // Paralel sorgularla verileri çek
          const promises = [];
          for (let i = 0; i < followingIdsArray.length; i += batchSize) {
            const batch = followingIdsArray.slice(i, i + batchSize);
            const recsQueryBatch = query(
              collection(db, 'recommendations'), 
              where('userId', 'in', batch),
              orderBy('createdAt', 'desc'), 
              limit(20) 
            );
            promises.push(getDocs(recsQueryBatch));
          }
          
          // Tüm sorguları paralel olarak çalıştır
          const snapshots = await Promise.all(promises);
          snapshots.forEach(snapshot => {
            snapshot.forEach((doc) => {
              const recData = { id: doc.id, ...doc.data() } as any;
              allRecsData.push(recData);
            });
          });
        }

        if (allRecsData.length === 0) {
          // Eğer hiç tavsiye yoksa ve kimseyi takip etmiyorsa, hasNoFollowing'ı true yap
          const followingCount = followingList.length;
          if (followingCount === 0) {
            setHasNoFollowing(true);
          }
          setRecommendations([]);
          setIsLoading(false);
          return;
        }

        const recsData = allRecsData;
        const userIDs = new Set<string>();

        recsData.forEach((rec) => {
          if (rec.userId && typeof rec.userId === 'string' && rec.userId.length > 5) {
            userIDs.add(rec.userId);
          }
        });

        if (userIDs.size === 0 && recsData.length > 0) {
           const fetchedData: RecommendationCardData[] = recsData.map(rec => ({
                id: rec.id, title: rec.title || 'Başlık Yok', text: rec.text || '', image: rec.image || null,
                category: rec.category || 'Kategori Yok', userId: rec.userId || '', 
                user: { name: '@bilinmeyen', avatar: `https://ui-avatars.com/api/?name=?&background=random` }, isLiked: false,
           }));
           setRecommendations(fetchedData);
           setIsLoading(false);
           return;
        }

        const userMap = new Map<string, { username: string, photoURL: string, name: string }>();

        if (userIDs.size > 0) {
          // Firestore 'in' operatörü maksimum 10 eleman alır
          const userIdsArray = Array.from(userIDs);
          const promises = [];
          
          // Paralel sorgularla kullanıcı verilerini çek
          for (let i = 0; i < userIdsArray.length; i += 10) {
            const batch = userIdsArray.slice(i, i + 10);
            const usersQuery = query(
              collection(db, 'users'),
              where(documentId(), 'in', batch)
            );
            promises.push(getDocs(usersQuery));
          }
          
          // Tüm sorguları paralel olarak çalıştır
          const snapshots = await Promise.all(promises);
          snapshots.forEach(snapshot => {
            snapshot.forEach((doc) => {
              const data = doc.data();
              userMap.set(doc.id, {
                username: data.username || 'bilinmeyen',
                photoURL: data.photoURL || '',
                name: data.name || '', 
              });
            });
          });
        }

        // Kullanıcının beğendiği tavsiyeleri kontrol et
        let likedRecommendationIds = new Set<string>();
        if (authUser?.uid) {
          try {
            const likesQuery = query(
              collection(db, 'users', authUser.uid, 'likedRecommendations')
            );
            const likesSnapshot = await getDocs(likesQuery);
            likesSnapshot.forEach(doc => {
              likedRecommendationIds.add(doc.id);
            });
          } catch (error) {
            console.error('Beğeniler yüklenirken hata oluştu:', error);
          }
        }

        // Beğeni ve yorum sayılarını batch olarak çek
        const recommendationIds = recsData.map(rec => rec.id);
        const countsMap = new Map<string, { likeCount: number; commentCount: number }>();
        
        if (recommendationIds.length > 0) {
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
        
        const fetchedData: RecommendationCardData[] = [];
        for (const rec of recsData) {
          // Takip edilen kullanıcıların ve kendi tavsiyelerini ekle
          // followingIds set'ine kendi ID'si de eklendi, bu yüzden kendi tavsiyeleri de dahil
          if (!followingIds.has(rec.userId)) {
            continue;
          }
          
          const userInfo = userMap.get(rec.userId);
          let finalUsername = '@bilinmeyen'; 
          let finalAvatar: string;
          if (userInfo) { 
            if (userInfo.name) { finalUsername = userInfo.name; }
            else if (userInfo.username && userInfo.username !== 'bilinmeyen') { finalUsername = `@${userInfo.username}`; }
            finalAvatar = getAvatarUrlWithFallback(userInfo.photoURL, userInfo.name, userInfo.username);
          } else { 
             finalAvatar = `https://ui-avatars.com/api/?name=?&background=random`; 
          }
          
          // Beğenme durumunu kontrol et
          const isLiked = likedRecommendationIds.has(rec.id);
          
          // Sayıları al
          const counts = countsMap.get(rec.id) || { likeCount: 0, commentCount: 0 };
          
          fetchedData.push({
            id: rec.id, 
            title: rec.title || 'Başlık Yok', 
            text: rec.text || '', 
            image: rec.image || null,
            category: rec.category || 'Kategori Yok', 
            userId: rec.userId || '', 
            user: { name: finalUsername, avatar: finalAvatar }, 
            isLiked: isLiked,
            likeCount: counts.likeCount,
            commentCount: counts.commentCount,
            createdAt: rec.createdAt,
          });
        }
        
        // Tarihe göre sıralama yapılmıyor - Firebase'den zaten sıralı geliyor
        
        setRecommendations(fetchedData);
      } catch (err: any) {
        console.error("Firebase'den veri çekerken hata:", err);
        setError('Tavsiyeler yüklenemedi. Lütfen tekrar deneyin.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    };

  useEffect(() => {
    fetchRecommendations();
  }, [authUser?.uid]);

  const onRefresh = useCallback(() => {
    // Yenileme sırasında mevcut verileri koru
    setRefreshing(true);
    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid]);

  const containerStyle = {
    backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight,
  };
  const headerStyle = {
    backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight,
  };
  const headerTextStyle = {
    color: isDark ? COLORS.textDark : COLORS.textLight,
  };
  const iconColor = isDark ? COLORS.textDark : COLORS.textLight;

  const renderContent = () => {
    if (hasNoFollowing) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="people-outline" size={64} color={isDark ? COLORS.mutedDark : COLORS.mutedLight} />
          <Text style={[styles.emptyTitle, { color: isDark ? COLORS.textDark : COLORS.textLight }]}>
            Henüz kimseyi takip etmiyorsun! 🎉
          </Text>
          <Text style={[styles.emptySubtitle, { color: isDark ? COLORS.mutedDark : COLORS.mutedLight }]}>
            Keşfet sayfasından ilginç insanları bulup takip etmeye başlayabilirsin. Böylece onların harika tavsiyelerini görebilirsin!
          </Text>
          <Pressable 
            style={[styles.exploreButton, { backgroundColor: COLORS.primary }]}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <Text style={styles.exploreButtonText}>Keşfet Sayfasına Git</Text>
          </Pressable>
        </View>
      );
    }

    if (recommendations.length === 0 && !isLoading && !refreshing) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inbox" size={64} color={isDark ? COLORS.mutedDark : COLORS.mutedLight} />
          <Text style={[styles.emptyTitle, { color: isDark ? COLORS.textDark : COLORS.textLight }]}>
            Henüz tavsiye yok
          </Text>
          <Text style={[styles.emptySubtitle, { color: isDark ? COLORS.mutedDark : COLORS.mutedLight }]}>
            Takip ettiğin kullanıcılar henüz tavsiye paylaşmamış. Biraz bekleyelim veya daha fazla kişi takip et!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.feedContainer}>
        {recommendations.map((item) => (
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
        ))}
      </View>
    );
  };
  
  // Yüklenme, Hata ve Boş Durum Fonksiyonları
  // İlk yükleme sırasında spinner göster, refresh sırasında mevcut içeriği göster
  if (isLoading && !refreshing && recommendations.length === 0) {
    return (
      <View style={[styles.spinnerContainer, containerStyle]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, {color: isDark ? COLORS.mutedDark : COLORS.mutedLight}]}>
          Tavsiyeler yükleniyor...
        </Text>
      </View>
    );
  }
  if (error && !refreshing) {
    return (
      <View style={[styles.spinnerContainer, containerStyle]}>
        <MaterialIcons name="error-outline" size={48} color="red" />
        <Text style={[styles.errorText, { color: 'red' }]}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView 
      style={[styles.safeArea, containerStyle]}
      edges={Platform.OS === 'ios' ? ['top', 'bottom'] : ['top']}
    >
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={Platform.OS === 'android' ? (isDark ? COLORS.backgroundDark : COLORS.backgroundLight) : undefined}
        translucent={Platform.OS === 'android'}
      />

      <View style={[styles.header, headerStyle]}>
        <Text style={[styles.headerTitle, { color: '#BA68C8' }]}>Tavsiyece</Text>
        <View style={styles.headerIconsContainer}>
          <Pressable 
            style={styles.headerIconButton}
            onPress={() => router.push('/(tabs)/notifications')}
          >
            <MaterialIcons name="notifications" size={24} color="#BA68C8" />
          </Pressable>
          <Pressable 
            style={styles.headerIconButton}
            onPress={() => {
              // Mesaj sayfası henüz yoksa placeholder
              // router.push('/(tabs)/messages');
            }}
          >
            <MaterialIcons name="send" size={24} color="#BA68C8" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

// StyleSheet:
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  headerButton: {
    height: 48,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 16,
  },
  subHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: 'rgba(155, 89, 182, 0.2)',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  actionButtonWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCountVertical: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Eski stiller (geriye dönük uyumluluk için)
  cardImagePlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  imagePlaceholderContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: -0.015,
  },
  cardDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  cardUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  username: {
    fontSize: 14,
  },
  tag: {
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  // Yüklenme ve Hata Stilleri
  spinnerContainer: {
    paddingVertical: 48,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  exploreButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});