// app/profile/[id].tsx

import { MaterialIcons } from '@expo/vector-icons';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { CustomTabBar } from '../../components/CustomTabBar';
// Firebase (Authentication ve Firestore)
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { COLORS } from '../../constants/theme';
import { auth, db } from '../../firebaseConfig';
import { getFollowers, getFollowing } from '../../services/firebase/userService';
import { FollowUser, RecommendationSnippet, UserProfile } from '../../types';

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

export default function UserProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<'recommendations'>('recommendations');
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
        
        // 3. Takipçi ve takip edilen listelerini çek (servis kullanarak)
        const [followersList, followingList] = await Promise.all([
          getFollowers(viewedUserId, 5),
          getFollowing(viewedUserId, 5),
        ]);
        setFollowers(followersList);
        setFollowing(followingList);

        // Ben bu kullanıcıyı takip ediyor muyum?
        if (currentUserId) {
            const myFollowingRef = doc(db, 'users', currentUserId, 'following', viewedUserId);
            const myFollowingSnap = await getDoc(myFollowingRef);
            setAmIFollowingThisUser(myFollowingSnap.exists());
        }
        
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
         <StatusBar barStyle="light-content" />
         <ActivityIndicator size="large" color={COLORS.primary} />
         <Text style={mutedTextStyle}>Profil yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  if (error || !userProfile) { 
     return (
      <SafeAreaView style={[styles.safeArea, containerStyle, styles.fullScreenCenter]}>
         <StatusBar barStyle="light-content" />
         <Stack.Screen options={{ headerShown: true, title: "Hata", headerTitleAlign: 'center', headerLeft: () => (<Pressable onPress={() => router.back()}><MaterialIcons name="arrow-back" size={24} color={textStyle.color} /></Pressable>) }} />
         <MaterialIcons name="error-outline" size={48} color="red" />
         <Text style={[styles.errorText, { color: 'red' }]}>{error || "Profil bulunamadı."}</Text>
      </SafeAreaView>
    );
  }

  const profileImageUrl = userProfile.photoURL;
  const ProfileImagePlaceholder = () => (
    <View style={styles.profileImageContainerSmall}>
       <MaterialIcons name="person" size={40} color={isDark ? COLORS.mutedDark : COLORS.mutedLight} />
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
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

      <ScrollView contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 80 : 85 }}>
        <View style={styles.mainContent}>
          {/* Profil Bilgileri - Yeni Tasarım: Profil resmi solda, bilgiler yanında */}
          <View style={styles.profileHeaderContainerNew}>
            <View style={[styles.profileImageWrapperNew, { borderColor: isDark ? COLORS.primary : COLORS.primary }]}>
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.profileImageNewSmall} />
              ) : (
                <ProfileImagePlaceholder />
              )}
            </View>
            <View style={styles.profileInfoContainer}>
              <View style={styles.profileInfoHeader}>
                <View style={styles.profileInfoText}>
                  <Text style={[styles.profileNameNew, textStyle]}>{userProfile.name || "İsimsiz"}</Text>
                  {userProfile.username && (
                    <Text style={[styles.profileUsername, mutedTextStyle]}>@{userProfile.username}</Text>
                  )}
                </View>
                {currentUserId === viewedUserId ? (
                  <Pressable 
                    style={[styles.editButtonNew, { backgroundColor: COLORS.primary }]}
                    onPress={() => router.push('/edit-profile')}
                  >
                    <MaterialIcons name="edit" size={18} color="#FFFFFF" />
                    <Text style={styles.editButtonTextNew}>Düzenle</Text>
                  </Pressable>
                ) : (
                  <Pressable 
                    style={[
                      styles.followButtonNew,
                      amIFollowingThisUser 
                        ? (isDark ? styles.followingButtonDark : styles.followingButtonLight)
                        : { backgroundColor: COLORS.primary }
                    ]}
                    onPress={async () => {
                      if (!currentUserId) return;
                      const followingRef = doc(db, 'users', currentUserId, 'following', viewedUserId);
                      const followerRef = doc(db, 'users', viewedUserId, 'followers', currentUserId);
                      try {
                        const batch = writeBatch(db);
                        if (amIFollowingThisUser) {
                          batch.delete(followingRef);
                          batch.delete(followerRef);
                          setAmIFollowingThisUser(false);
                        } else {
                          const timestamp = serverTimestamp();
                          batch.set(followingRef, { createdAt: timestamp });
                          batch.set(followerRef, { createdAt: timestamp });
                          setAmIFollowingThisUser(true);
                        }
                        await batch.commit();
                      } catch (err) {
                        console.error('Takip hatası:', err);
                      }
                    }}
                  >
                    <Text style={[
                      styles.followButtonTextNew,
                      amIFollowingThisUser 
                        ? (isDark ? styles.followingTextDark : styles.followingTextLight)
                        : { color: '#FFFFFF' }
                    ]}>
                      {amIFollowingThisUser ? 'Takip Ediliyor' : 'Takip Et'}
                    </Text>
                  </Pressable>
                )}
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
              onPress={() => router.push(`/profile/${viewedUserId}/followers`)}
            >
              <Text style={[styles.statNumberNew, { color: COLORS.primary }]}>{userProfile.followersCount || followers.length}</Text>
              <Text style={[styles.statLabelNew, mutedTextStyle]}>Takipçi</Text>
            </Pressable>
            <View style={[styles.statDivider, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]} />
            <Pressable 
              style={styles.statItemNew} 
              onPress={() => router.push(`/profile/${viewedUserId}/following`)}
            >
              <Text style={[styles.statNumberNew, { color: COLORS.primary }]}>{userProfile.followingCount || following.length}</Text>
              <Text style={[styles.statLabelNew, mutedTextStyle]}>Takip</Text>
            </Pressable>
          </View>

          {/* Sekme Navigasyonu - Sadece Tavsiyeler */}
          <View style={[styles.tabContainer, separatorStyle]}>
            <Pressable
              style={[styles.tabButton, activeTab === 'recommendations' && activeTabBorderStyle]}
              onPress={() => setActiveTab('recommendations')}
            >
              <Text style={[styles.tabText, activeTab === 'recommendations' ? activeTabStyle : inactiveTabStyle]}>
                Tavsiyeler
              </Text>
            </Pressable>
          </View>

          {/* Sekme İçeriği */}
          <View style={styles.gridContainer}>
            {userRecommendations.length > 0 ? (
              userRecommendations.map((item) => (
                <RecommendationGridItem key={item.id} item={item} isDark={isDark} />
              ))
            ) : (
              <Text style={[mutedTextStyle, { marginTop: 20, textAlign: 'center' }]}>Henüz hiç tavsiye eklenmemiş.</Text>
            )}
          </View>


        </View>
      </ScrollView>

      {/* Custom Tab Bar */}
      <CustomTabBar />
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
  profileImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    padding: 4,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  profileImageContainer: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#bfdbfe', justifyContent: 'center', alignItems: 'center' },
  profileImageContainerSmall: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#bfdbfe', justifyContent: 'center', alignItems: 'center' },
  profileImageNew: { width: 112, height: 112, borderRadius: 56 },
  profileImageNewSmall: { width: 74, height: 74, borderRadius: 37 },
  profileNameNew: { fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  profileUsername: { fontSize: 16, marginBottom: 12 },
  profileBioNew: { textAlign: 'left', marginTop: 4, fontSize: 14, lineHeight: 20 },
  editButtonNew: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, gap: 6 },
  editButtonTextNew: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  followButtonNew: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, gap: 6 },
  followButtonTextNew: { fontWeight: '600', fontSize: 15 },
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
  statItemNew: { flex: 1, alignItems: 'center' },
  statNumberNew: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statLabelNew: { fontSize: 13, fontWeight: '500' },
  statDivider: { width: 1, height: 40 },
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