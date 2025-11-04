// app/profile/[id].tsx

import { MaterialIcons } from '@expo/vector-icons';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
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

const FollowListItem = ({ 
  user, 
  isDark, 
  isFollowing,
  currentUserId
}: { 
  user: FollowUser, 
  isDark: boolean, 
  isFollowing: boolean,
  currentUserId: string | undefined // Giriş yapan kullanıcı ID'si (opsiyonel)
}) => {
  
  const [followingState, setFollowingState] = useState(isFollowing);
  const [isLoading, setIsLoading] = useState(false); 

  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };

  const handleFollowToggle = async () => {
    if (!currentUserId || currentUserId === user.id) return; 
    
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
    if (!currentUserId || currentUserId === user.id) {
        return <View style={styles.followButtonBase} />; // Boş yer tutucu
    }

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
      {renderButton()}
    </View>
  );
};


// --- Ana Profil Ekranı ---

export default function UserProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<'recommendations' | 'saved'>('recommendations');
  const router = useRouter(); 
  const { id: viewedUserId } = useLocalSearchParams<{ id: string }>(); // Görüntülenen profilin ID'si
  const currentUserId = auth.currentUser?.uid; // Giriş yapan kullanıcının (BENİM) ID'si

  // Dinamik State'ler
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRecommendations, setUserRecommendations] = useState<RecommendationSnippet[]>([]);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [amIFollowingThisUser, setAmIFollowingThisUser] = useState(false); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      if (!viewedUserId) { 
        setError("Kullanıcı ID'si bulunamadı.");
        setIsLoading(false);
        return;
      }

      try {
        // 1. Görüntülenen kullanıcının profilini çek
        const userRef = doc(db, 'users', viewedUserId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserProfile({ id: userSnap.id, ...userSnap.data() } as UserProfile);
        } else {
          setError("Profil bilgileri bulunamadı.");
          setIsLoading(false);
          return; 
        }

        // 2. Görüntülenen kullanıcının tavsiyelerini çek
        const recQuery = query(
          collection(db, 'recommendations'),
          where('userId', '==', viewedUserId), 
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
        
        // 3. Görüntülenen kullanıcının takipçi ID'lerini çek
        const followersQuery = query(collection(db, 'users', viewedUserId, 'followers'), limit(5));
        const followersSnapshot = await getDocs(followersQuery);
        const followerUserIds = followersSnapshot.docs.map(doc => doc.id);

        // 4. Görüntülenen kullanıcının takip edilen ID'lerini çek
        const followingQuery = query(collection(db, 'users', viewedUserId, 'following'), limit(5));
        const followingSnapshot = await getDocs(followingQuery);
        const followingUserIds = followingSnapshot.docs.map(doc => doc.id);

        // Ben bu kullanıcıyı takip ediyor muyum?
        if (currentUserId) {
            const myFollowingRef = doc(db, 'users', currentUserId, 'following', viewedUserId);
            const myFollowingSnap = await getDoc(myFollowingRef);
            setAmIFollowingThisUser(myFollowingSnap.exists());
        }

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
  }, [viewedUserId, currentUserId]); 

  // --- (Stiller ve Yüklenme/Hata kontrolleri) ---
  const containerStyle = { backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  const editButtonStyle = { backgroundColor: isDark ? COLORS.buttonBgDark : COLORS.buttonBgLight };
  const editButtonTextStyle = { color: isDark ? COLORS.buttonTextDark : COLORS.buttonTextLight };
  const activeTabBorderStyle = { borderColor: COLORS.primary };
  const inactiveTabStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  const activeTabStyle = { color: COLORS.primary };
  const separatorStyle = { borderColor: isDark ? '#374151' : '#e5e7eb' };
  
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, containerStyle, styles.fullScreenCenter]}>
         <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
         <ActivityIndicator size="large" color={COLORS.primary} />
         <Text style={mutedTextStyle}>Profil yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  if (error || !userProfile) { 
     return (
      <SafeAreaView style={[styles.safeArea, containerStyle, styles.fullScreenCenter]}>
         <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
         <Stack.Screen options={{ headerShown: true, title: "Hata", headerTitleAlign: 'center', headerLeft: () => (<Pressable onPress={() => router.back()}><MaterialIcons name="arrow-back" size={24} color={textStyle.color} /></Pressable>) }} />
         <MaterialIcons name="error-outline" size={48} color="red" />
         <Text style={[styles.errorText, { color: 'red' }]}>{error || "Profil bulunamadı."}</Text>
      </SafeAreaView>
    );
  }

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
      <Stack.Screen 
        options={{ 
            headerShown: true, 
            title: userProfile.username, 
            headerTitleAlign: 'center',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: containerStyle.backgroundColor },
            headerTitleStyle: { color: textStyle.color },
            headerLeft: () => (
                <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
                    <MaterialIcons name="arrow-back" size={24} color={textStyle.color} />
                </Pressable>
            ),
            headerRight: () => <View style={{width: 40}} /> 
        }} 
      />

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
            
            {currentUserId === viewedUserId ? (
                <Pressable style={[styles.editButton, editButtonStyle]}>
                    <Text style={[styles.editButtonText, editButtonTextStyle]}>Profili Düzenle</Text>
                </Pressable>
            ) : (
                 <FollowListItem 
                    user={{id: userProfile.id, name: userProfile.name, username: userProfile.username, avatar: userProfile.photoURL || ''}}
                    isDark={isDark}
                    isFollowing={amIFollowingThisUser}
                    currentUserId={currentUserId}
                 />
            )}
            
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
            {/* --- DÜZELTME: </Etx>} hatası --- */}
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, textStyle]}>{userProfile.followingCount || following.length}</Text>
              <Text style={[styles.statLabel, mutedTextStyle]}>Takip</Text>
            </View>
            {/* --- DÜZELTME SONU --- */}
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

          {activeTab === 'saved' && (
             <View style={{ padding: 20 }}>
                 <Text style={mutedTextStyle}>Bu kullanıcının herkese açık kaydedilenleri yok.</Text>
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
                    <Text style={mutedTextStyle}>Henüz takipçisi yok.</Text>
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
                     <Text style={mutedTextStyle}>Henüz kimseyi takip etmiyor.</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  mainContent: { padding: 16 },
  profileInfoContainer: { alignItems: 'center' },
  profileImageContainer: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#bfdbfe', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  profileImage: { width: 112, height: 112, borderRadius: 56, marginBottom: 16 },
  profileName: { fontSize: 24, fontWeight: 'bold' },
  profileBio: { textAlign: 'center', marginTop: 8, marginHorizontal: 24 },
  editButton: { marginTop: 16, width: '100%', paddingVertical: 12, borderRadius: 8 },
  editButtonText: { fontWeight: '600', textAlign: 'center' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', textAlign: 'center', marginVertical: 24 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 14 },
  tabContainer: { borderBottomWidth: 1, flexDirection: 'row' },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderColor: 'transparent' },
  activeTabBorder: { borderColor: COLORS.primary },
  tabText: { fontWeight: '600' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16 },
  gridItem: { width: '48%', borderRadius: 8, overflow: 'hidden', marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  gridImage: { width: '100%', height: 128 },
  gridContent: { padding: 12 },
  gridTitle: { fontWeight: '600' },
  gridCategory: { fontSize: 14, marginTop: 4 },
  followSection: {},
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  followList: { gap: 16 },
  followItemContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  followItemUser: { flexDirection: 'row', alignItems: 'center' },
  avatarMedium: { width: 48, height: 48, borderRadius: 24, marginRight: 16, backgroundColor: '#e0e0e0' },
  followName: { fontWeight: '600' },
  followUsername: { fontSize: 14 },
  followButtonBase: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, minWidth: 110, alignItems: 'center', justifyContent: 'center', minHeight: 34 },
  followButtonText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  followButton: { backgroundColor: COLORS.primary },
  followingButtonLight: { backgroundColor: '#e5e7eb' },
  followingButtonDark: { backgroundColor: '#374151' },
  followingTextLight: { color: '#1f2937' },
  followingTextDark: { color: '#d1d5db' },
  unfollowButton: { borderColor: COLORS.primary, borderWidth: 1 },
  unfollowButtonText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});