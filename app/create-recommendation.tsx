import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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

// --- YENİ FONKSİYON: Türkçe karakterleri normalleştir ---
const normalizeText = (text: string) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ı/g, 'i') // 'ı' -> 'i'
    .normalize("NFD") // Karakterleri ve aksanlarını ayır
    .replace(/[\u0300-\u036f]/g, "") // Aksanları kaldır (ö -> o, ü -> u)
    .replace(/ç/g, 'c') // Diğer dönüşümler
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g');
};
// --- FONKSİYON SONU ---

// Renkler (Ekran görüntüsüne göre)
const COLORS = {
  primary: '#FF9800', // Ekran görüntüsündeki Turuncu
  backgroundLight: '#F7F8FA', // Ekran görüntüsündeki hafif gri arka plan
  backgroundDark: '#212121', // Ana koyu arka plan
  secondary: '#A0AEC0', // Placeholder text rengi
  textLight: '#1A202C', // Koyu metin
  textDark: '#FAFAFA', // Açık metin
  cardLight: '#FFFFFF', // Açık modda input/modal arkaplanı
  cardDark: '#2C2C2C', // Koyu modda input/modal arkaplanı
  borderLight: '#E2E8F0', // Açık mod border
  borderDark: '#4A5568', // Koyu mod border
  error: '#ef4444',
  overlay: 'rgba(0, 0, 0, 0.5)', // Modal arka plan karartması
};

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
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // --- GÜNCELLENMİŞ Paylaşma Fonksiyonu ---
  const handleShare = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert("Hata", "Tavsiye eklemek için giriş yapmış olmalısınız.");
      return;
    }
    if (!title || !text || !selectedCategory) {
      setError("Tüm alanlar zorunludur (Başlık, Detay, Kategori).");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // --- YENİ: Anahtar Kelimeleri (Keywords) Oluştur ---
      const titleLower = normalizeText(title);
      const textLower = normalizeText(text);
      const categoryLower = normalizeText(selectedCategory);

      // Başlık, açıklama ve kategorideki kelimeleri birleştir
      // Noktalama işaretlerini kaldır (opsiyonel ama önerilir)
      const cleanText = (titleLower + ' ' + textLower)
                          .replace(/[.,!?:;()"'-]/g, ' ')
                          .replace(/\s+/g, ' '); // Birden fazla boşluğu tek boşluğa indir

      const textKeywords = cleanText.split(' ');
      
      // Benzersiz (unique) ve boş olmayan kelimelerden bir set oluştur
      // Kategori adını da ekle
      const keywords = [
        ...new Set([
          ...textKeywords,
          categoryLower,
          titleLower // Başlığın tamamını da ekle
        ])
      ].filter(k => k.length > 1); // 1 harflik kelimeleri (a, o vb.) arama dışı bırak
      // --- YENİ BÖLÜM SONU ---


      // 2. Firebase'e Ekle
      await addDoc(collection(db, "recommendations"), {
        title: title,
        text: text,
        category: selectedCategory,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        image: null,
        rating: 0,
        source: "app",
        // --- YENİ: Arama için bu alanları ekle ---
        title_lowercase: titleLower, // Başlangıç araması için
        keywords: keywords // 'array-contains' araması için
      });

      // 3. Başarılı
      Alert.alert("Başarılı", "Tavsiyeniz başarıyla paylaşıldı!");
      router.back();

    } catch (err: any) {
      console.error("Tavsiye ekleme hatası:", err);
      setError("Tavsiye paylaşılırken bir hata oluştu: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Kategori seçildiğinde ---
  const onCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setIsModalVisible(false);
  };
  
  // --- Dinamik Stiller ---
  const containerStyle = { backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: COLORS.secondary };
  const inputStyle = {
    backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight,
    color: isDark ? COLORS.textDark : COLORS.textLight,
    borderColor: isDark ? COLORS.borderDark : COLORS.borderLight,
  };
  const pickerButtonStyle = {
    ...inputStyle,
    height: 56,
    paddingHorizontal: 16,
    justifyContent: 'space-between' as const, 
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  };
  const pickerButtonTextStyle = {
    fontSize: 16,
    color: selectedCategory ? (isDark ? COLORS.textDark : COLORS.textLight) : COLORS.secondary,
  };

  const dashBorderStyle = { borderColor: isDark ? COLORS.borderDark : '#CBD5E0', opacity: 0.7 };
  const photoButtonTextStyle = { color: COLORS.primary };
  const photoButtonBgStyle = { backgroundColor: 'rgba(255, 152, 0, 0.1)' };
  const modalContentStyle = {
    backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight,
  };
  
  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]} edges={['bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <Stack.Screen
        options={{
          title: 'Yeni Tavsiye Ekle',
          headerTitleAlign: 'center',
          headerShadowVisible: false, 
          headerStyle: { backgroundColor: containerStyle.backgroundColor }, 
          headerTitleStyle: { color: textStyle.color }, 
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color={textStyle.color} />
            </Pressable>
          ),
          headerRight: () => (
             <Pressable style={{ paddingRight: 16 }}>
              <MaterialIcons name="more-vert" size={24} color={textStyle.color} />
            </Pressable>
          ),
        }}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          {/* Başlık */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, textStyle]}>Tavsiye Başlığı</Text>
            <TextInput
              style={[styles.input, inputStyle]}
              placeholder="Tavsiye Başlığı"
              placeholderTextColor={COLORS.secondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>
          
          {/* Detaylar */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, textStyle]}>Tavsiyen hakkında detayları paylaş</Text>
            <TextInput
              style={[styles.input, styles.textArea, inputStyle]}
              placeholder="Tavsiyen hakkında detayları paylaş"
              placeholderTextColor={COLORS.secondary}
              value={text}
              onChangeText={setText}
              multiline={true}
              numberOfLines={5}
            />
          </View>
          
          {/* Kategori (Modal Butonu) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, textStyle]}>Kategori Seç</Text>
            {isCategoriesLoading ? (
                <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Pressable style={[styles.input, pickerButtonStyle]} onPress={() => setIsModalVisible(true)}>
                <Text style={pickerButtonTextStyle}>
                  {selectedCategory || "Kategori Seç"}
                </Text>
                <MaterialIcons name="unfold-more" size={20} color={COLORS.secondary} />
              </Pressable>
            )}
          </View>
          
          {/* Fotoğraf Yükleme (Görsel) */}
          <View style={[styles.photoContainer, dashBorderStyle]}>
            <Text style={[styles.photoTitle, textStyle]}>Fotoğraf Ekle</Text>
            <Text style={[styles.photoSubtitle, mutedTextStyle]}>
              Bir fotoğraf ekleyerek tavsiyeni daha çekici hale getirebilirsin.
            </Text>
            <Pressable 
              style={[styles.photoButton, photoButtonBgStyle]}
              onPress={() => Alert.alert("Geliştirme Aşamasında", "Fotoğraf yükleme özelliği yakında eklenecektir.")}
            >
              <MaterialIcons name="photo-camera" size={20} color={photoButtonTextStyle.color} />
              <Text style={[styles.photoButtonText, photoButtonTextStyle]}>Fotoğraf Yükle</Text>
            </Pressable>
          </View>
          
           {/* Hata Mesajı */}
           {error && (
              <Text style={styles.errorText}>{error}</Text>
           )}
           
        </View>
      </ScrollView>

      {/* Paylaş Butonu (Sticky Footer) */}
      <View style={[styles.footer, containerStyle, {borderTopColor: isDark ? COLORS.borderDark : COLORS.borderLight}]}>
        <Pressable 
          style={[styles.shareButton, { backgroundColor: isLoading ? COLORS.secondary : COLORS.primary }]}
          onPress={handleShare}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.shareButtonText}>Tavsiyeni Paylaş</Text>
          )}
        </Pressable>
      </View>

      {/* --- KATEGORİ SEÇME MODAL'I --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)} />

        <SafeAreaView style={[styles.modalContentContainer]} edges={['bottom']}>
           <View style={[styles.modalContent, modalContentStyle]}>
              <View style={styles.modalHandle} /> 
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, textStyle]}>Kategori Seç</Text>
                <Pressable style={styles.closeButton} onPress={() => setIsModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color={mutedTextStyle.color} />
                </Pressable>
              </View>
              
              <FlatList
                data={categories}
                keyExtractor={(item) => item.id}
                numColumns={3} 
                style={styles.gridContainer}
                columnWrapperStyle={styles.gridRow}
                renderItem={({ item }) => {
                  const isSelected = selectedCategory === item.name;
                  const chipStyle = {
                      backgroundColor: isSelected ? COLORS.primary : (isDark ? COLORS.backgroundDark : COLORS.backgroundLight), 
                      borderColor: isSelected ? COLORS.primary : (isDark ? COLORS.borderDark : COLORS.borderLight),
                  };
                  const chipTextStyle = {
                      color: isSelected ? '#FFFFFF' : (isDark ? COLORS.textDark : COLORS.textLight),
                  };

                  return (
                      <Pressable 
                        style={[styles.categoryChip, chipStyle]}
                        onPress={() => onCategorySelect(item.name)}
                      >
                        <Text style={[styles.categoryChipText, chipTextStyle]}>{item.name}</Text>
                      </Pressable>
                  );
                }}
              />
           </View>
        </SafeAreaView>
      </Modal>

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
  formContainer: {
    padding: 20,
    gap: 24,
    paddingBottom: 40,
  },
  inputGroup: {},
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    height: 56,
    borderRadius: 12, 
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 144,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  // Fotoğraf Yükleme
  photoContainer: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  photoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  photoSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Hata
  errorText: {
      color: COLORS.error,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '500',
      marginTop: -8,
  },
  // Footer
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  shareButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // --- YENİ ESTETİK MODAL STİLLERİ ---
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.overlay,
  },
  modalContentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 20,
  },
  modalHandle: { 
    width: 40,
    height: 5,
    backgroundColor: COLORS.secondary,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  // Izgara (Grid) Stilleri
  gridContainer: {
    paddingHorizontal: 16,
    maxHeight: 300, 
  },
  gridRow: {
    justifyContent: 'flex-start', 
    gap: 12, 
  },
  categoryChip: {
    flex: 1, 
    maxWidth: '31%', 
    minWidth: '31%',
    paddingVertical: 16,
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryChipText: {
    fontWeight: '600',
    fontSize: 14,
  },
});