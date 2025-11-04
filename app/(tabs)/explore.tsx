import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // Alt bileşenler (Item'lar) için bu GEREKLİ
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebaseConfig';

// --- Normalleştirme fonksiyonu ---
const normalizeText = (text: string) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ı/g, 'i') 
    .normalize("NFD") 
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g');
};

// Renkler
const COLORS = {
  primary: '#14b8a6',
  backgroundLight: '#f6f7f8',
  backgroundDark: '#101c22',
  textLight: '#0d171b',
  textDark: '#f8fafc',
  cardLight: '#ffffff',
  cardDark: '#182832',
  mutedLight: '#6b7280', 
  mutedDark: '#9ca3af', 
  borderLight: '#e5e7eb',
  borderDark: '#374151',
};

// --- Tipler ---
type Category = { id: string; name: string; };
type TrendingItem = { id: string; title: string; description: string; image: string | null; };
type FeaturedUser = { id: string; name: string; username: string; bio: string; avatar: string; isFollowing: boolean; };
type RecommendationResult = { id: string; title: string; category: string; image: string | null; };
type UserResult = { id: string; name: string; username: string; avatar: string; };

// --- Prop Tipleri ---
type CategoryChipProps = { category: Category; isActive: boolean; isDark: boolean; onPress: () => void; };
type TrendingCardProps = { item: TrendingItem; isDark: boolean; };
type UserCardProps = { user: FeaturedUser; isDark: boolean; currentUserId: string | undefined; };
type RecommendationResultItemProps = { item: RecommendationResult; isDark: boolean; };
type UserResultItemProps = { item: UserResult; isDark: boolean; };


// --- Alt Bileşenler ---

const CategoryChip = ({ category, isActive, isDark, onPress }: CategoryChipProps) => {
  const chipStyle = {
    backgroundColor: isActive ? COLORS.primary : isDark ? COLORS.cardDark : COLORS.cardLight,
  };
  const textStyle = {
    color: isActive ? '#FFFFFF' : isDark ? COLORS.textDark : COLORS.textLight,
  };
  return (
    <Pressable style={[styles.chipContainer, chipStyle]} onPress={onPress}>
      <Text style={[styles.chipText, textStyle]}>{category.name}</Text>
    </Pressable>
  );
};

const TrendingCard = ({ item, isDark }: TrendingCardProps) => {
  const cardStyle = { backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  return (
    <View style={[styles.trendingCard, cardStyle]}>
      <ImageBackground
        source={item.image ? { uri: item.image } : undefined}
        style={[styles.trendingImage, !item.image && styles.imagePlaceholder]}
        imageStyle={{ borderRadius: 6 }} 
        resizeMode="cover"
      >
        {!item.image && (<MaterialIcons name="image" size={40} color={mutedTextStyle.color} />)}
      </ImageBackground>
      <View>
        <Text style={[styles.trendingTitle, textStyle]}>{item.title}</Text>
        <Text style={[styles.trendingDesc, mutedTextStyle]}>{item.description}</Text>
      </View>
    </View>
  );
};

const UserCard = ({ user, isDark, currentUserId }: UserCardProps) => {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  const [isLoading, setIsLoading] = useState(false); 
  const cardStyle = { backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  const followButtonStyle = {
    backgroundColor: isFollowing ? (isDark ? 'rgba(20, 184, 166, 0.3)' : 'rgba(20, 184, 166, 0.2)') : COLORS.primary,
  };
  const followButtonTextStyle = {
    color: isFollowing ? COLORS.primary : '#FFFFFF',
  };
  const handleFollowToggle = async () => {
    if (!currentUserId || currentUserId === user.id) return; 
    setIsLoading(true);
    const followingRef = doc(db, 'users', currentUserId, 'following', user.id);
    const followerRef = doc(db, 'users', user.id, 'followers', currentUserId);
    try {
      const batch = writeBatch(db);
      if (isFollowing) {
        batch.delete(followingRef);
        batch.delete(followerRef);
      } else {
        const timestamp = serverTimestamp();
        batch.set(followingRef, { createdAt: timestamp });
        batch.set(followerRef, { createdAt: timestamp });
      }
      await batch.commit();
      setIsFollowing(!isFollowing); 
    } catch (err) {
      console.error("Keşfet - Takip etme hatası:", err);
    } finally {
      setIsLoading(false);
    }
  };
  if (user.id === currentUserId) return null; 
  return (
    <View style={[styles.userCard, cardStyle]}>
      <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, textStyle]}>{user.name}</Text>
        <Text style={[styles.userFollowers, mutedTextStyle]} numberOfLines={1}>
          {user.bio || `@${user.username}`}
        </Text>
      </View>
      <Pressable 
        style={[styles.followButton, followButtonStyle]} 
        onPress={handleFollowToggle}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isFollowing ? COLORS.primary : '#FFFFFF'} />
        ) : (
          <Text style={[styles.followButtonText, followButtonTextStyle]}>
            {isFollowing ? 'Takip' : 'Takip Et'}
          </Text>
        )}
      </Pressable>
    </View>
  );
};

const RecommendationResultItem = ({ item, isDark }: RecommendationResultItemProps) => {
  const router = useRouter(); // <-- router burada tanımlı
  const cardStyle = { backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  
  return (
    <Pressable 
      style={[styles.resultCard, cardStyle, {borderColor: isDark ? COLORS.borderDark : COLORS.borderLight}]}
      onPress={() => router.push({ pathname: '/recommendation/[id]', params: { id: item.id } })}
    >
      <Image 
        source={item.image ? { uri: item.image } : require('../../assets/images/icon.png')} 
        style={styles.resultImage} 
      />
      <View style={styles.resultContent}>
        <Text style={[styles.resultTitle, textStyle]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.resultSubtitle, mutedTextStyle]}>{item.category}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={mutedTextStyle.color} />
    </Pressable>
  );
};
const UserResultItem = ({ item, isDark }: UserResultItemProps) => {
   const router = useRouter(); // <-- router burada tanımlı
   const cardStyle = { backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight };
   const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
   const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };

   return (
    <Pressable 
      style={[styles.resultCard, cardStyle, {borderColor: isDark ? COLORS.borderDark : COLORS.borderLight}]}
      onPress={() => router.push({ pathname: '/profile/[id]', params: { id: item.id } })}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.resultContent}>
        <Text style={[styles.resultTitle, textStyle]}>{item.name}</Text>
        <Text style={[styles.resultSubtitle, mutedTextStyle]}>@{item.username}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={mutedTextStyle.color} />
    </Pressable>
   );
};

// --- Ana Ekran Bileşeni ---
export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user: authUser } = useAuth(); 
  const currentUserId = authUser?.uid;
  // const router = useRouter(); // <-- DÜZELTME: Kullanılmadığı için kaldırıldı

  // State'ler
  const [isLoading, setIsLoading] = useState(true); 
  const [isLoadingUsers, setIsLoadingUsers] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [featuredUsers, setFeaturedUsers] = useState<FeaturedUser[]>([]);
  const [activeCategory, setActiveCategory] = useState('all'); 
  const [myFollowingIds, setMyFollowingIds] = useState<Set<string>>(new Set()); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [recommendationResults, setRecommendationResults] = useState<RecommendationResult[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);

  // 1. useEffect (Takip listesi, Kategoriler, Trendler)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true); 
        setError(null);

        if (currentUserId) {
          const followingQuery = query(collection(db, 'users', currentUserId, 'following'));
          const followingSnapshot = await getDocs(followingQuery);
          const followingIds = followingSnapshot.docs.map(doc => doc.id);
          setMyFollowingIds(new Set(followingIds));
        } else {
          setMyFollowingIds(new Set()); 
        }

        const catQuery = query(collection(db, 'categories'), orderBy('order', 'asc'));
        const catSnapshot = await getDocs(catQuery);
        const fetchedCategories: Category[] = [{ id: 'all', name: 'Tümü' }];
        catSnapshot.forEach(doc => {
          fetchedCategories.push({ id: doc.id, ...doc.data() } as Category);
        });
        setCategories(fetchedCategories);

        const trendQuery = query(collection(db, 'trending'));
        const trendSnapshot = await getDocs(trendQuery);
        const fetchedTrending: TrendingItem[] = [];
        trendSnapshot.forEach(doc => {
          fetchedTrending.push({ id: doc.id, ...doc.data() } as TrendingItem);
        });
        setTrendingItems(fetchedTrending);

      } catch (err: any) {
        console.error("Explore (ilk veri) çekilirken hata:", err);
        setError("Veriler yüklenemedi: " + err.message);
      } finally {
        setIsLoading(false); 
      }
    };
    fetchInitialData();
  }, [currentUserId]); 

  // 2. useEffect (Yeni Kullanıcılar)
  useEffect(() => {
    if (isLoading) {
       setIsLoadingUsers(false);
       return;
    }
    const fetchFeaturedUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const userQuery = query(
          collection(db, 'users'), 
          orderBy('createdAt', 'desc'), 
          limit(5)
        );
        const userSnapshot = await getDocs(userQuery);
        const fetchedUsers: FeaturedUser[] = [];
        userSnapshot.forEach(doc => {
          const data = doc.data();
          const avatar = data.photoURL || `https://ui-avatars.com/api/?name=${data.username || data.name || 'T'}&background=random`;
          
          fetchedUsers.push({
            id: doc.id,
            name: data.name || 'İsimsiz',
            username: data.username || 'kullaniciadi',
            bio: data.bio || '',
            avatar: avatar,
            isFollowing: myFollowingIds.has(doc.id), 
          });
        });
        setFeaturedUsers(fetchedUsers);
      } catch (err: any) {
         console.error("Explore (kullanıcı) çekilirken hata:", err);
         setError(prevError => prevError || "Yeni kullanıcılar yüklenemedi.");
      } finally {
         setIsLoadingUsers(false);
      }
    };
    fetchFeaturedUsers();
  }, [myFollowingIds, isLoading]); 

  // Arama Fonksiyonu
  const performSearch = async (term: string) => {
    if (!term.trim()) {
        setIsSearching(false);
        setUserResults([]);
        setRecommendationResults([]);
        return;
    }
    setIsSearching(true);
    setIsSearchLoading(true);
    const searchTerm = normalizeText(term); // <-- Türkçe karakterler düzeltildi
    try {
      // Tavsiyelerde Ara (keywords ile)
      const recQuery = query(
        collection(db, 'recommendations'),
        where('keywords', 'array-contains', searchTerm), // <-- keywords'te ara
        limit(10)
      );
      const recSnapshot = await getDocs(recQuery);
      const recs: RecommendationResult[] = [];
      recSnapshot.forEach(doc => {
        const data = doc.data();
        recs.push({
          id: doc.id,
          title: data.title,
          category: data.category,
          image: data.image || null,
        });
      });
      setRecommendationResults(recs);

      // Kullanıcılarda Ara
      const userQuery = query(
        collection(db, 'users'),
        where('username_lowercase', '>=', searchTerm),
        where('username_lowercase', '<=', searchTerm + '\uf8ff'),
        limit(10)
      );
      const userSnapshot = await getDocs(userQuery);
      const users: UserResult[] = [];
      userSnapshot.forEach(doc => {
        const data = doc.data();
        users.push({
          id: doc.id,
          name: data.name,
          username: data.username,
          avatar: data.photoURL || `https://ui-avatars.com/api/?name=${data.name || data.username}&background=random`,
        });
      });
      setUserResults(users);
    } catch (err: any) {
      console.error("Arama hatası:", err);
      if ((err as Error).message.includes("index")) {
           setError("Arama dizini oluşturuluyor. Lütfen Firebase konsolunu kontrol edin.");
      } else {
           setError("Arama sırasında bir hata oluştu.");
      }
    } finally {
      setIsSearchLoading(false); 
    }
  };
  
  // Arama Tetikleyicileri
  const handleSearchQueryChange = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
        setIsSearching(false);
        setUserResults([]);
        setRecommendationResults([]);
    }
  };
  const handleSearchSubmit = () => {
    performSearch(searchQuery);
  };

  // Dinamik Stiller
  const containerStyle = { backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight };
  const headerStyle = { backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight };
  const headerTextStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  const iconColor = isDark ? COLORS.textDark : COLORS.textLight;
  const searchBg = isDark ? 'rgba(20, 184, 166, 0.3)' : 'rgba(20, 184, 166, 0.2)';
  const placeholderColor = isDark ? 'rgba(20, 184, 166, 0.7)' : 'rgba(20, 184, 166, 0.8)';

  // Yüklenme veya Hata durumu
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, containerStyle, styles.spinnerContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: isDark ? COLORS.mutedDark : COLORS.mutedLight }]}>
          Keşfet yükleniyor...
        </Text>
      </SafeAreaView>
    );
  }
  if (error && categories.length === 0) {
     return (
      <SafeAreaView style={[styles.safeArea, containerStyle, styles.spinnerContainer]}>
        <MaterialIcons name="error-outline" size={48} color="red" />
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  // Arama Sonuçlarını Render Etme
  const renderSearchResults = () => (
    <View style={styles.resultsContainer}>
        {isSearchLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} />
        ) : (
            <>
                <Text style={[styles.title, textStyle]}>Kullanıcılar</Text>
                {userResults.length > 0 ? (
                  userResults.map(user => (
                    <UserResultItem key={user.id} item={user} isDark={isDark} />
                  ))
                ) : (
                  <Text style={[styles.noResultText, mutedTextStyle]}>Eşleşen kullanıcı bulunamadı.</Text>
                )}

                <Text style={[styles.title, textStyle, { marginTop: 30 }]}>Tavsiyeler</Text>
                {recommendationResults.length > 0 ? (
                  recommendationResults.map(rec => (
                    <RecommendationResultItem key={rec.id} item={rec} isDark={isDark} />
                  ))
                ) : (
                  <Text style={[styles.noResultText, mutedTextStyle]}>Eşleşen tavsiye bulunamadı.</Text>
                )}
            </>
        )}
    </View>
  );

  // Varsayılan Keşfet İçeriğini Render Etme
  const renderDefaultContent = () => (
    <>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              category={category}
              isActive={category.id === activeCategory}
              isDark={isDark}
              onPress={() => setActiveCategory(category.id)} 
            />
          ))}
        </ScrollView>
      </View>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingScroll}
        >
          {trendingItems.map((item) => (
            <TrendingCard key={item.id} item={item} isDark={isDark} />
          ))}
        </ScrollView>
      </View>
      <View style={styles.usersSection}>
        <Text style={[styles.sectionTitle, headerTextStyle]}>Yeni Tavsiyeciler</Text>
        <View style={styles.usersList}>
          {isLoadingUsers ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            featuredUsers.map((user) => (
              <UserCard 
                key={user.id} 
                user={user} 
                isDark={isDark}
                currentUserId={currentUserId}
              />
            ))
          )}
          {error && !isLoadingUsers && featuredUsers.length === 0 && (
               <Text style={[styles.errorText, {fontSize: 14, marginTop: 10}]}>{error}</Text>
          )}
        </View>
      </View>
    </>
  );

  // Ana Render
  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, headerStyle]}>
        <Pressable style={styles.headerButton}>
          <Ionicons name="arrow-back" size={28} color={iconColor} />
        </Pressable>
        <Text style={[styles.headerTitle, headerTextStyle]}>Keşfet</Text>
        <View style={styles.headerButton} /> 
      </View>

      <View style={[styles.searchWrapper, containerStyle]}>
        <View style={styles.searchContainer}>
          <View style={[styles.searchIcon, { backgroundColor: searchBg }]}>
            <MaterialIcons name="search" size={24} color={COLORS.primary} />
          </View>
          <TextInput
            style={[styles.searchInput, { backgroundColor: searchBg, color: isDark ? COLORS.textDark : COLORS.textLight }]}
            placeholder="Tavsiye, kullanıcı, kategori ara..."
            placeholderTextColor={placeholderColor}
            value={searchQuery} 
            onChangeText={handleSearchQueryChange} 
            onSubmitEditing={handleSearchSubmit} 
            returnKeyType="search" 
          />
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {isSearching ? renderSearchResults() : renderDefaultContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- StyleSheet ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerButton: {
    height: 48,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12, 
    overflow: 'hidden',
  },
  searchIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 16,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  chipScroll: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  chipContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  trendingScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  trendingCard: {
    width: 288, 
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  trendingImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
     backgroundColor: 'rgba(0,0,0,0.05)',
  },
  trendingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  trendingDesc: {
    fontSize: 14,
    marginTop: 4,
  },
  usersSection: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  usersList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userFollowers: {
    fontSize: 14,
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 90, 
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsContainer: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noResultText: {
    fontSize: 16,
    paddingLeft: 8,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  separator: {
    borderBottomWidth: 1,
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#e0e0e0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    backgroundColor: '#e0e0e0',
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
});