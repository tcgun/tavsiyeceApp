import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
// Firebase importları
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

import { COLORS } from '../constants/theme';
import { getUserProfile } from '../services/firebase/userService';
import { getAvatarUrlWithFallback } from '../utils/avatarUtils';
import { normalizeText } from '../utils/textUtils';

type Category = {
  id: string;
  name: string;
};

// --- Ana Bileşen ---
export default function CreateRecommendationScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // Form State'leri
  const [text, setText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kullanıcı profil bilgileri
  const [userProfile, setUserProfile] = useState<any>(null);

  // Kullanıcı profilini çek
  useEffect(() => {
    const fetchUserProfile = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);
      }
    };
    fetchUserProfile();
  }, []);

  // --- Kategorileri Firebase'den Çekme ---
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsCategoriesLoading(true);
        const catQuery = query(collection(db, 'categories'), orderBy('order', 'asc'));
        const catSnapshot = await getDocs(catQuery);
        const fetchedCategories: Category[] = [];
        catSnapshot.forEach(doc => {
          fetchedCategories.push({ id: doc.id, ...doc.data() } as Category);
        });
        setCategories(fetchedCategories);
      } catch (err) {
        console.error("Kategoriler çekilirken hata:", err);
        setError("Kategoriler yüklenemedi.");
      } finally {
        setIsCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // --- Paylaşma Fonksiyonu ---
  const handleShare = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert("Hata", "Tavsiye eklemek için giriş yapmış olmalısınız.");
      return;
    }
    if (!text.trim() || !selectedCategory) {
      setError("Tavsiye metni ve kategori zorunludur.");
      Alert.alert("Eksik Bilgi", "Lütfen tavsiye metni ve kategori seçin.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Anahtar Kelimeleri (Keywords) Oluştur
      const textLower = normalizeText(text);
      const categoryLower = normalizeText(selectedCategory);

      // Metindeki kelimeleri birleştir
      const cleanText = textLower
                          .replace(/[.,!?:;()"'-]/g, ' ')
                          .replace(/\s+/g, ' '); // Birden fazla boşluğu tek boşluğa indir

      const textKeywords = cleanText.split(' ');
      
      // Benzersiz (unique) ve boş olmayan kelimelerden bir set oluştur
      const keywords = [
        ...new Set([
          ...textKeywords,
          categoryLower,
        ])
      ].filter(k => k.length > 1); // 1 harflik kelimeleri (a, o vb.) arama dışı bırak

      // Başlık oluştur (ilk 50 karakter)
      const title = text.trim().split('\n')[0].substring(0, 50) || 'Başlıksız';

      console.log('Paylaşım başlatılıyor...', { title, category: selectedCategory, userId: currentUser.uid });

      // Firebase'e Ekle
      const docRef = await addDoc(collection(db, "recommendations"), {
        title: title,
        text: text.trim(),
        category: selectedCategory,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        image: null,
        rating: 0,
        source: "app",
        // Arama için bu alanları ekle
        title_lowercase: normalizeText(title),
        keywords: keywords
      });

      console.log('Tavsiye başarıyla eklendi:', docRef.id);

      // Başarılı
      Alert.alert("Başarılı", "Tavsiyeniz başarıyla paylaşıldı!", [
        {
          text: "Tamam",
          onPress: () => {
            router.replace('/(tabs)');
          }
        }
      ]);

    } catch (err: any) {
      console.error("Tavsiye ekleme hatası:", err);
      const errorMessage = err.message || 'Bilinmeyen bir hata oluştu';
      setError("Tavsiye paylaşılırken bir hata oluştu: " + errorMessage);
      Alert.alert(
        "Hata", 
        "Tavsiye paylaşılırken bir hata oluştu: " + errorMessage,
        [{ text: "Tamam" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // --- Kategori seçildiğinde ---
  const onCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setIsCategoryModalVisible(false);
  };

  const MAX_CHARACTERS = 280;
  const characterCount = text.length;

  // Profil avatar URL'i
  const avatarUrl = userProfile 
    ? getAvatarUrlWithFallback(userProfile.photoURL, userProfile.name, userProfile.username)
    : null;

  const containerStyle = { backgroundColor: COLORS.backgroundDark };

  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      {/* Özel Header */}
      <View style={[styles.header, containerStyle]}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Yeni Tavsiye</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={[styles.container, containerStyle]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* İçerik Alanı */}
          <View style={styles.contentArea}>
            {/* Profil Avatarı */}
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialIcons name="person" size={24} color="#FFFFFF" />
                </View>
              )}
            </View>

            {/* Metin Girişi */}
            <TextInput
              style={styles.textInput}
              placeholder="Tavsiyeni buraya yaz..."
              placeholderTextColor="#9CA3AF"
              value={text}
              onChangeText={setText}
              multiline={true}
              maxLength={MAX_CHARACTERS}
              textAlignVertical="top"
            />
          </View>

          {/* Hata Mesajı */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color={COLORS.error || '#ef4444'} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Kategori Seçimi - Alt barın üstünde */}
        <Pressable 
          style={[
            styles.categoryButton, 
            containerStyle,
            { borderColor: selectedCategory ? COLORS.primary : 'rgba(255, 255, 255, 0.1)' }
          ]}
          onPress={() => setIsCategoryModalVisible(true)}
        >
          <MaterialIcons name="category" size={20} color={selectedCategory ? "#FFFFFF" : "#9CA3AF"} />
          <Text style={[styles.categoryButtonText, selectedCategory && styles.categoryButtonTextSelected]}>
            {selectedCategory || "Kategori Seç"}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={selectedCategory ? "#FFFFFF" : "#9CA3AF"} />
        </Pressable>

        {/* Alt Footer - Resim, Karakter Sayacı, Paylaş Butonu */}
        <SafeAreaView style={[styles.footerContainer, containerStyle]} edges={['bottom']}>
          <View style={styles.footer}>
            <Pressable 
              style={styles.imageButton}
              onPress={() => Alert.alert("Geliştirme Aşamasında", "Fotoğraf yükleme özelliği yakında eklenecektir.")}
            >
              <MaterialIcons name="photo-library" size={24} color="#9CA3AF" />
            </Pressable>
            
            <Text style={styles.characterCount}>
              {characterCount}/{MAX_CHARACTERS}
            </Text>
            
            <Pressable 
              style={[
                styles.shareButton, 
                (isLoading || !text.trim() || !selectedCategory) && styles.shareButtonDisabled
              ]}
              onPress={handleShare}
              disabled={isLoading || !text.trim() || !selectedCategory}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.shareButtonText}>Paylaş</Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Kategori Seçme Modal'ı - Basit tasarım */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCategoryModalVisible}
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setIsCategoryModalVisible(false)} 
        />

        <View style={styles.modalContentContainer}>
          <SafeAreaView style={styles.modalSafeArea} edges={['bottom']}>
            <View style={[styles.modalContent, { backgroundColor: COLORS.cardDark }]}>
              {/* Drag Handle */}
              <View style={styles.modalDragHandleContainer}>
                <View style={styles.modalHandle} />
              </View>

              {/* Basit Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: COLORS.textDark }]}>
                  Kategori Seç
                </Text>
                <Pressable 
                  style={styles.modalCloseButton} 
                  onPress={() => setIsCategoryModalVisible(false)}
                >
                  <MaterialIcons 
                    name="close" 
                    size={24} 
                    color={COLORS.mutedDark} 
                  />
                </Pressable>
              </View>
              
              {isCategoriesLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={COLORS.primary} size="large" />
                </View>
              ) : (
                <FlatList
                  data={categories}
                  keyExtractor={(item) => item.id}
                  numColumns={2}
                  style={styles.gridContainer}
                  contentContainerStyle={styles.gridContentContainer}
                  columnWrapperStyle={styles.gridRow}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = selectedCategory === item.name;
                    const chipStyle = {
                      backgroundColor: isSelected 
                        ? COLORS.primary 
                        : 'rgba(255, 255, 255, 0.08)',
                      borderColor: isSelected 
                        ? COLORS.primary 
                        : 'rgba(255, 255, 255, 0.15)',
                    };
                    const chipTextStyle = {
                      color: isSelected 
                        ? '#FFFFFF' 
                        : COLORS.textDark,
                    };

                    return (
                      <Pressable 
                        style={[styles.categoryChip, chipStyle]}
                        onPress={() => onCategorySelect(item.name)}
                      >
                        <Text style={[styles.categoryChipText, chipTextStyle]}>
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  }}
                />
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- StyleSheet ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 32,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  contentArea: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  avatarContainer: {
    marginTop: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 120,
    paddingTop: 0,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
  },
  categoryButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
  },
  categoryButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.error || '#ef4444',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    marginHorizontal: 16,
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    gap: 8,
  },
  footerContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  imageButton: {
    padding: 8,
  },
  characterCount: {
    fontSize: 14,
    color: '#9CA3AF',
    flex: 1,
    textAlign: 'center',
  },
  shareButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Stilleri - Modern ve estetik tasarım
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalContentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
  },
  modalSafeArea: {
    backgroundColor: COLORS.cardDark,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 8,
    maxHeight: '100%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 30,
  },
  modalDragHandleContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  modalHandle: {
    width: 56,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 80,
    alignItems: 'center',
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  gridContentContainer: {
    paddingBottom: 32,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  categoryChip: {
    flex: 1,
    maxWidth: '48%',
    minWidth: '48%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
});
