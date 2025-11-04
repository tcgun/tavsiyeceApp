import { MaterialIcons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

// Renkler
const COLORS = {
  primary: '#4299e1', // Blue
  backgroundLight: '#ffffff',
  backgroundDark: '#121212',
  textLight: '#1f2937', 
  textDark: '#f3f4f6', 
  mutedLight: '#6b7280', 
  mutedDark: '#9ca3af', 
  cardLight: '#ffffff',
  cardDark: '#1f2937', 
  buttonBgLight: '#ebf8ff', 
  buttonBgDark: '#1e3a8a', 
  buttonTextLight: '#3b82f6', 
  buttonTextDark: '#bfdbfe', 
};

// --- TypeScript Tipleri ---
type UserProfile = {
  id: string; 
  name: string;
  username: string;
  bio: string;
  photoURL: string | null;
  recommendationsCount?: number;
  followersCount?: number;
  followingCount?: number;
};

type RecommendationSnippet = {
  id: string;
  title: string;
  category: string;
  image: string | null;
};

type FollowUser = {
    id: string;
    name: string;
    username: string;
    avatar: string;
};

// --- Alt Bileşenler ---

// Tavsiye Kartı
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
        <Image
          source={item.image ? { uri: item.image } : require('../../assets/images/icon.png')}
          style={styles.gridImage}
          resizeMode="cover"
        />
        <View style={styles.gridContent}>
          <Text style={[styles.gridTitle, textStyle]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.gridCategory, mutedTextStyle]}>{item.category}</Text>
        </View>
      </Pressable>
    </Link>
  );
};

// Takipçi/Takip Edilen Listesi Öğesi
const FollowListItem = ({ 
  user, 
  isDark, 
  isFollowing,
  currentUserId
}: { 
  user: FollowUser, 
  isDark: boolean, 
  isFollowing: boolean,
  currentUserId: string
}) => {
  
  const [followingState, setFollowingState] = useState(isFollowing);
  const [isLoading, setIsLoading] = useState(false); 

  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };

  const handleFollowToggle = async () => {
    if (currentUserId === user.id) return; 
    
    setIsLoading(true);

    const followingRef = doc(db, 'users', currentUserId, 'following', user.id);
    const followerRef = doc(db, 'users', user.id, 'followers', currentUserId);

    try {
      const batch = writeBatch(db);

      if (followingState) {
        batch.delete(followingRef); 
        batch.delete(followerRef);  
      } else {
        const timestamp = serverTimestamp();
        batch.set(followingRef, { createdAt: timestamp }); 
        batch.set(followerRef, { createdAt: timestamp });  
      }
      await batch.commit();
      setFollowingState(!followingState);

    } catch (err) {
      console.error("Takip etme/bırakma hatası:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderButton = () => {
    if (isLoading) {
       return (
         <View style={[styles.followButtonBase, isDark ? styles.followingButtonDark : styles.followingButtonLight]}>
           <ActivityIndicator size="small" color={isDark ? COLORS.textDark : COLORS.textLight} />
         </View>
       );
    }

    if (followingState) { 
      return (
        <Pressable 
          style={[styles.followButtonBase, isDark ? styles.followingButtonDark : styles.followingButtonLight]} 
          onPress={handleFollowToggle}
        >
          <Text style={[styles.followButtonText, isDark ? styles.followingTextDark : styles.followingTextLight]}>Takip Ediliyor</Text>
        </Pressable>
      );
    } else { 
      return (
        <Pressable 
          style={[styles.followButtonBase, styles.followButton]} 
          onPress={handleFollowToggle}
        >
          <Text style={styles.followButtonText}>Takip Et</Text>
        </Pressable>
      );
    }
  };

  return (
    <View style={styles.followItemContainer}>
      <View style={styles.followItemUser}>
        <Image source={{ uri: user.avatar }} style={styles.avatarMedium} />
        <View>
          <Text style={[styles.followName, textStyle]}>{user.name}</Text>
          <Text style={[styles.followUsername, mutedTextStyle]}>@{user.username}</Text>
        </View>
      </View>
      {/* Kendi profilinse butonu gösterme */}
      {currentUserId !== user.id && renderButton()} 
    </View>
  );
};


// --- Ana Profil Ekranı ---

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<'recommendations' | 'saved'>('recommendations');
  const router = useRouter(); 

  // Dinamik State'ler
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRecommendations, setUserRecommendations] = useState<RecommendationSnippet[]>([]);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  
  const [savedRecommendations, setSavedRecommendations] = useState<RecommendationSnippet[]>([]); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = auth.currentUser?.uid;

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

        if (userSnap.exists()) {
          setUserProfile({ id: userSnap.id, ...userSnap.data() } as UserProfile);
        } else {
          setError("Profil bilgileri bulunamadı.");
        }

        // 2. Kullanıcının tavsiyelerini çek (limitli)
        const recQuery = query(
          collection(db, 'recommendations'),
          where('userId', '==', currentUserId),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const recSnapshot = await getDocs(recQuery);
        const fetchedRecs: RecommendationSnippet[] = [];
        recSnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedRecs.push({
            id: doc.id,
            title: data.title || 'Başlıksız',
            category: data.category || 'Kategori Yok',
            image: data.image || null,
          });
        });
        setUserRecommendations(fetchedRecs);
        
        // --- KAYDEDİLENLERİ ÇEK ---
        const savedRecsRef = collection(db, 'users', currentUserId, 'savedRecommendations');
        const savedSnap = await getDocs(savedRecsRef);
        const savedIds = savedSnap.docs.map(doc => doc.id);

        if (savedIds.length > 0) {
            const recsToFetch = savedIds.slice(0, 10);
            const savedRecsQuery = query(
                collection(db, 'recommendations'),
                where(documentId(), 'in', recsToFetch)
            );
            const savedRecsSnapshot = await getDocs(savedRecsQuery);
            const fetchedSavedRecs: RecommendationSnippet[] = [];
            savedRecsSnapshot.forEach((doc) => {
                 const data = doc.data();
                 fetchedSavedRecs.push({
                    id: doc.id,
                    title: data.title || 'Başlıksız',
                    category: data.category || 'Kategori Yok',
                    image: data.image || null,
                 });
            });
            setSavedRecommendations(fetchedSavedRecs);
        }

        // 3. Takipçi ID'lerini çek (Son 5)
        const followersQuery = query(collection(db, 'users', currentUserId, 'followers'), limit(5));
        const followersSnapshot = await getDocs(followersQuery);
        const followerUserIds = followersSnapshot.docs.map(doc => doc.id);

        // 4. Takip Edilen ID'lerini çek (Son 5)
        const followingQuery = query(collection(db, 'users', currentUserId, 'following'), limit(5));
        const followingSnapshot = await getDocs(followingQuery);
        const followingUserIds = followingSnapshot.docs.map(doc => doc.id);

        // 5. Tüm bu ID'ler için kullanıcı detaylarını tek sorguda çek
        const allUserIds = [...new Set([...followerUserIds, ...followingUserIds])];
        const userMap = new Map<string, FollowUser>();
        
        if (allUserIds.length > 0) {
            const usersQuery = query(
              collection(db, 'users'),
              where(documentId(), 'in', allUserIds)
            );
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach((doc) => {
                const data = doc.data();
                userMap.set(doc.id, {
                    id: doc.id,
                    name: data.name || 'İsimsiz',
                    username: data.username || 'kullanici',
                    avatar: data.photoURL || `https://ui-avatars.com/api/?name=${data.name || '?'}&background=random`,
                });
            });
        }
        
        // 6. Takipçi listesini oluştur
        const followersList = followerUserIds
          .map(id => userMap.get(id))
          .filter((user): user is FollowUser => user !== undefined);
        setFollowers(followersList);
        
        // 7. Takip edilen listesini oluştur
        const followingList = followingUserIds
          .map(id => userMap.get(id))
          .filter((user): user is FollowUser => user !== undefined);
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

  // Dinamik Stiller
  const containerStyle = { backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  const editButtonStyle = { backgroundColor: isDark ? COLORS.buttonBgDark : COLORS.buttonBgLight };
  const editButtonTextStyle = { color: isDark ? COLORS.buttonTextDark : COLORS.buttonTextLight };
  const activeTabBorderStyle = { borderColor: COLORS.primary };
  const inactiveTabStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  const activeTabStyle = { color: COLORS.primary };
  const separatorStyle = { borderColor: isDark ? '#374151' : '#e5e7eb' };


  // Yüklenme veya Hata Durumu
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, containerStyle, styles.fullScreenCenter]}>
         <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
         <ActivityIndicator size="large" color={COLORS.primary} />
         <Text style={mutedTextStyle}>Profil yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  if (error || !userProfile || !currentUserId) { 
     return (
      <SafeAreaView style={[styles.safeArea, containerStyle, styles.fullScreenCenter]}>
         <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
         <MaterialIcons name="error-outline" size={48} color="red" />
         <Text style={[styles.errorText, { color: 'red' }]}>{error || "Profil bulunamadı."}</Text>
      </SafeAreaView>
    );
  }

  // Profil verilerini al
  const profileImageUrl = userProfile.photoURL;
  const ProfileImagePlaceholder = () => (
    <View style={styles.profileImageContainer}>
       <MaterialIcons name="person" size={60} color={isDark ? COLORS.mutedDark : COLORS.mutedLight} />
    </View>
  );

  const followingIdsSet = new Set(following.map(user => user.id));

  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Özel Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, textStyle]}>Profil</Text>
        <Pressable onPress={() => router.push('/notification-settings')}>
          <MaterialIcons name="settings" size={24} color={mutedTextStyle.color} />
        </Pressable>
      </View>

      <ScrollView>
        <View style={styles.mainContent}>
          {/* Profil Bilgileri */}
          <View style={styles.profileInfoContainer}>
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.profileImage} />
            ) : (
              <ProfileImagePlaceholder />
            )}
            <Text style={[styles.profileName, textStyle]}>{userProfile.name || "İsimsiz"}</Text>
            {userProfile.bio && (
              <Text style={[styles.profileBio, mutedTextStyle]}>
                {userProfile.bio}
              </Text>
            )}
            <Pressable 
              style={[styles.editButton, editButtonStyle]}
              onPress={() => router.push('/edit-profile')}
            >
              <Text style={[styles.editButtonText, editButtonTextStyle]}>Profili Düzenle</Text>
            </Pressable>
          </View>

          {/* İstatistikler */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, textStyle]}>{userProfile.recommendationsCount || userRecommendations.length}</Text>
              <Text style={[styles.statLabel, mutedTextStyle]}>Tavsiye</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, textStyle]}>{userProfile.followersCount || followers.length}</Text>
              <Text style={[styles.statLabel, mutedTextStyle]}>Takipçi</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, textStyle]}>{userProfile.followingCount || following.length}</Text>
              <Text style={[styles.statLabel, mutedTextStyle]}>Takip</Text>
            </View>
          </View>

          {/* Sekme Navigasyonu */}
          <View style={[styles.tabContainer, separatorStyle]}>
            <Pressable
              style={[styles.tabButton, activeTab === 'recommendations' && activeTabBorderStyle]}
              onPress={() => setActiveTab('recommendations')}
            >
              <Text style={[styles.tabText, activeTab === 'recommendations' ? activeTabStyle : inactiveTabStyle]}>
                Tavsiyeler
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabButton, activeTab === 'saved' && activeTabBorderStyle]}
              onPress={() => setActiveTab('saved')}
            >
              <Text style={[styles.tabText, activeTab === 'saved' ? activeTabStyle : inactiveTabStyle]}>
                Kaydedilenler
              </Text>
            </Pressable>
          </View>

          {/* Sekme İçeriği */}
          {activeTab === 'recommendations' && (
            <View style={styles.gridContainer}>
              {userRecommendations.length > 0 ? (
                userRecommendations.map((item) => (
                  <RecommendationGridItem key={item.id} item={item} isDark={isDark} />
                ))
              ) : (
                <Text style={[mutedTextStyle, { marginTop: 20, textAlign: 'center' }]}>Henüz hiç tavsiye eklenmemiş.</Text>
              )}
            </View>
          )}

          {/* --- KAYDEDİLENLER SEKMESİ İÇERİĞİ --- */}
          {activeTab === 'saved' && (
             <View style={styles.gridContainer}>
                {savedRecommendations.length > 0 ? (
                    savedRecommendations.map((item) => (
                      <RecommendationGridItem key={item.id} item={item} isDark={isDark} />
                    ))
                ) : (
                    <Text style={[mutedTextStyle, { marginTop: 20, textAlign: 'center' }]}>Henüz kaydedilmiş tavsiyen yok.</Text>
                )}
             </View>
          )}

          {/* Takipçi Listesi */}
          <View style={[styles.followSection, { marginTop: 32 }]}>
             <Text style={[styles.sectionTitle, textStyle]}>Takipçiler</Text>
             <View style={styles.followList}>
                {followers.length > 0 ? (
                    followers.map((user) => (
                        <FollowListItem 
                            key={user.id} 
                            user={user} 
                            isDark={isDark} 
                            isFollowing={followingIdsSet.has(user.id)}
                            currentUserId={currentUserId}
                        />
                    ))
                ) : (
                    <Text style={mutedTextStyle}>Henüz takipçin yok.</Text>
                )}
             </View>
          </View>

          {/* Takip Edilenler Listesi */}
          <View style={[styles.followSection, { marginTop: 32 }]}>
             <Text style={[styles.sectionTitle, textStyle]}>Takip Edilenler</Text>
             <View style={styles.followList}>
                {following.length > 0 ? (
                    following.map((user) => (
                        <FollowListItem 
                            key={user.id} 
                            user={user} 
                            isDark={isDark} 
                            isFollowing={true}
                            currentUserId={currentUserId}
                        />
                    ))
                ) : (
                     <Text style={mutedTextStyle}>Henüz kimseyi takip etmiyorsun.</Text>
                )}
             </View>
          </View>

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
  headerTitle: {
    fontSize: 20, // text-xl
    fontWeight: 'bold',
  },
  // Main Content
  mainContent: {
    padding: 16,
  },
  // Profile Info
  profileInfoContainer: {
    alignItems: 'center',
  },
  profileImageContainer: { // Placeholder için
    width: 112, // w-28
    height: 112, // h-28
    borderRadius: 56, // rounded-full
    backgroundColor: '#bfdbfe', // blue-300 (örnek)
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16, // mb-4
  },
  profileImage: { // Gerçek resim için
    width: 112,
    height: 112,
    borderRadius: 56,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24, // text-2xl
    fontWeight: 'bold',
  },
  profileBio: {
    textAlign: 'center',
    marginTop: 8, // mt-2
    marginHorizontal: 24, // mx-6
  },
  editButton: {
    marginTop: 16, // mt-4
    width: '100%',
    paddingVertical: 12, // py-3
    borderRadius: 8, // rounded-lg
  },
  editButtonText: {
    fontWeight: '600', // font-semibold
    textAlign: 'center',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    textAlign: 'center',
    marginVertical: 24, // my-6
  },
  statItem: {
    alignItems: 'center', // Text center için
  },
  statNumber: {
    fontSize: 20, // text-xl
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14, // text-sm
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