import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router'; // <-- useRouter eklendi
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
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Firebase
import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// Renkler
const COLORS = {
  primary: '#13a4ec',
  backgroundLight: '#f6f7f8',
  backgroundDark: '#101c22',
  cardLight: '#ffffff',
  cardDark: '#27272a',
  textLight: '#0f172a',
  textDark: '#f8fafc',
  textMutedLight: '#52525b',
  textMutedDark: '#a1a1aa',
};

// --- TİP TANIMLAMALARI ---
type User = {
  name: string;
  avatar: string;
};

type Recommendation = {
  id: string;
  category: string;
  title: string;
  text: string;
  user: User;
  userId: string; 
  image: string | null;
  isLiked: boolean;
};

type RecommendationCardProps = {
  item: Recommendation;
  isDark: boolean;
};

// --- BİLEŞENLER ---
const RecommendationCard = ({ item, isDark }: RecommendationCardProps) => { 
  const [isLiked, setIsLiked] = useState(item.isLiked);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const cardStyle = {
    backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight,
  };
  const textStyle = {
    color: isDark ? COLORS.textDark : COLORS.textLight,
  };
  const mutedTextStyle = {
    color: isDark ? COLORS.textMutedDark : COLORS.textMutedLight,
  };
  const iconColor = isDark ? COLORS.textMutedDark : COLORS.textMutedLight;
  const mutedIconColor = isDark ? COLORS.textMutedDark : COLORS.textMutedLight;

  return (
    <View style={[styles.cardContainer, cardStyle]}>
      <ImageBackground
        source={item.image ? { uri: item.image } : undefined}
        style={[
          styles.cardImage,
          !item.image && styles.cardImagePlaceholder
        ]}
        resizeMode="cover"
      >
        {!item.image && (
          <View style={styles.imagePlaceholderContent}>
            <MaterialIcons name="image" size={48} color={mutedTextStyle.color} />
            <Text style={[styles.placeholderText, mutedTextStyle]}>Resim Yok</Text>
          </View>
        )}
      </ImageBackground>

      <View style={styles.cardContent}>
        <View>
          <Text style={[styles.cardTitle, textStyle]}>{item.title}</Text>
          <Text style={[styles.cardDescription, mutedTextStyle]}>
            {item.text}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.cardUser}>
            <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
            <Text style={[styles.username, mutedTextStyle]}>{item.user.name}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.category}</Text>
          </View>
        </View>
        
        <View style={styles.cardActions}>
          {/* Yorum Butonu (Kendi Link'i ile) */}
          <Link 
            href={{ 
              pathname: "/recommendation/[id]", 
              params: { id: item.id, focusComment: 'true' } 
            }} 
            asChild
            // Tıklamanın ana karta "kabarcıklanmasını" (bubble) engelle
            onPress={(e) => { e.stopPropagation(); }} 
          >
            <Pressable style={styles.actionButton}>
              <MaterialIcons
                name="chat-bubble-outline"
                size={24}
                color={mutedIconColor} 
              />
            </Pressable>
          </Link>
          
          {/* Beğen Butonu */}
          <Pressable
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation(); // Bunun da kabarcıklanmasını engelle
              setIsLiked(!isLiked);
            }}
          >
            <MaterialIcons
              name={isLiked ? 'favorite' : 'favorite-border'}
              size={24}
              color={isLiked ? COLORS.primary : iconColor}
            />
          </Pressable>
          
          {/* Kaydet Butonu */}
          <Pressable
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation(); // Bunun da kabarcıklanmasını engelle
              setIsBookmarked(!isBookmarked);
            }}
          >
            <MaterialIcons
              name={isBookmarked ? 'bookmark' : 'bookmark-border'}
              size={24}
              color={isBookmarked ? COLORS.primary : iconColor}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

// --- Ana Ekran Bileşeni ---

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter(); // <-- DÜZELTME: Yönlendiriciyi tanımla

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log("Fetching recommendations..."); 

        const recsQuery = query(
          collection(db, 'recommendations'), 
          orderBy('createdAt', 'desc'), 
          limit(20) 
        );
        
        const recsSnapshot = await getDocs(recsQuery);
         console.log(`Found ${recsSnapshot.size} recommendations.`); 

        if (recsSnapshot.empty) {
          setRecommendations([]);
          setIsLoading(false);
          return;
        }

        const recsData: any[] = [];
        const userIDs = new Set<string>();

        recsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userId && typeof data.userId === 'string' && data.userId.length > 5) {
            userIDs.add(data.userId); 
            recsData.push({ id: doc.id, ...data });
          } else {
             console.warn(`Recommendation ID ${doc.id} has invalid or missing userId:`, data.userId);
          }
        });

        if (userIDs.size === 0 && recsData.length > 0) {
           console.warn("No valid userIds found in recommendations, showing as unknown.");
           const fetchedData: Recommendation[] = recsData.map(rec => ({
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
          console.log("Fetching users for IDs:", Array.from(userIDs));
          const usersQuery = query(
            collection(db, 'users'),
            where(documentId(), 'in', Array.from(userIDs))
          );
          const usersSnapshot = await getDocs(usersQuery);
          console.log(`Found ${usersSnapshot.size} users.`); 

          usersSnapshot.forEach((doc) => {
            const data = doc.data();
            console.log("Found user:", doc.id, data.name, data.username);
            userMap.set(doc.id, {
              username: data.username || 'bilinmeyen',
              photoURL: data.photoURL || '',
              name: data.name || '', 
            });
          });
          console.log("User map created:", userMap);
        }

        const fetchedData: Recommendation[] = [];
        for (const rec of recsData) {
          const userInfo = userMap.get(rec.userId);
          let finalUsername = '@bilinmeyen'; 
          let finalAvatar: string;
          if (userInfo) { 
            if (userInfo.name) { finalUsername = userInfo.name; }
            else if (userInfo.username && userInfo.username !== 'bilinmeyen') { finalUsername = `@${userInfo.username}`; }
            finalAvatar = userInfo.photoURL || `https://ui-avatars.com/api/?name=${userInfo.name || userInfo.username || '?'}&background=random`;
          } else { 
             console.warn(`User data not found for userId: ${rec.userId} in recommendation ${rec.id}`);
             finalAvatar = `https://ui-avatars.com/api/?name=?&background=random`; 
          }
          fetchedData.push({
            id: rec.id, title: rec.title || 'Başlık Yok', text: rec.text || '', image: rec.image || null,
            category: rec.category || 'Kategori Yok', userId: rec.userId || '', 
            user: { name: finalUsername, avatar: finalAvatar }, isLiked: false,
          });
        }
        console.log("Final merged data count:", fetchedData.length); 
        setRecommendations(fetchedData);
      } catch (err: any) {
        console.error("Firebase'den veri çekerken hata:", err);
        setError('Tavsiyeler yüklenemedi. Lütfen tekrar deneyin.');
      } finally {
        setIsLoading(false); 
      }
    };

    fetchRecommendations();
  }, []);

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
    if (isLoading) { /* ... (Yüklenme kodu) ... */ }
    if (error) { /* ... (Hata kodu) ... */ }
    if (recommendations.length === 0) { /* ... (Boş liste kodu) ... */ }

    // --- GÜNCELLENDİ: renderContent'teki <Link> kaldırıldı ---
    return (
      <View style={styles.feedContainer}>
        {recommendations.map((item) => (
          // Dış <Link> kaldırıldı, yerine onPress olan <Pressable> geldi
          <Pressable
            key={item.id}
            onPress={() => {
              // Kartın kendisine tıklandığında normal yönlendirme yap
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
  // --- GÜNCELLEME SONU ---
  
  // Yüklenme, Hata ve Boş Durum Fonksiyonları
  if (isLoading) {
    return (
      <View style={[styles.spinnerContainer, containerStyle]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, {color: isDark ? COLORS.textMutedDark : COLORS.textMutedLight}]}>
          Tavsiyeler yükleniyor...
        </Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.spinnerContainer, containerStyle]}>
        <MaterialIcons name="error-outline" size={48} color="red" />
        <Text style={[styles.errorText, { color: 'red' }]}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, headerStyle]}>
        <Pressable style={styles.headerButton}>
          <Ionicons name="search" size={24} color={iconColor} />
        </Pressable>
        <Text style={[styles.headerTitle, headerTextStyle]}>Tavsiyece</Text>
        <Pressable style={styles.headerButton}>
          <Ionicons name="chatbubble-outline" size={24} color={iconColor} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.subHeader}>
          <Text style={[styles.subHeaderTitle, headerTextStyle]}>Senin İçin</Text>
        </View>
        
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
    fontSize: 18,
    fontWeight: 'bold',
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
    gap: 16,
  },
  cardContainer: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  cardContent: {
    padding: 16,
    gap: 8,
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
    backgroundColor: 'rgba(19, 164, 236, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // İkonları sağa yasla
    alignItems: 'center',
    marginTop: 16,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8, // İkonlar arasına boşluk koy
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
  }
});