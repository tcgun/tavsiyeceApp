import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';

// --- DÜZELTME: Renkler turuncu temaya güncellendi ---
const COLORS = {
  primary: '#FF9800', // Turuncu (Tavsiye Ekle'den)
  backgroundLight: '#ffffff',
  backgroundDark: '#121212',
  textLight: '#1f2937', 
  textDark: '#f3f4f6', 
  mutedLight: '#6b7280', 
  mutedDark: '#9ca3af', 
  cardLight: '#F7F8FA', // Input arkaplanı
  cardDark: '#1E1E1E', // Koyu input arkaplanı
  borderLight: '#E2E8F0',
  borderDark: '#374151',
  error: '#ef4444',
  elementBgLight: 'rgba(255, 152, 0, 0.1)', // Turuncu %10
  elementBgDark: 'rgba(255, 152, 0, 0.2)', // Turuncu %20
};

// --- Türkçe Karakter Normalleştirme Fonksiyonu ---
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

// --- Ana Bileşen ---
export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { user: authUser } = useAuth(); // Giriş yapmış kullanıcıyı al

  // State'ler
  const [isLoading, setIsLoading] = useState(true); // Sayfa yükleniyor
  const [isSaving, setIsSaving] = useState(false);  // Kaydediliyor
  const [error, setError] = useState<string | null>(null);

  // Form State'leri
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  // --- 1. Verileri Çekme ---
  useEffect(() => {
    if (!authUser) {
      setError("Önce giriş yapmalısınız.");
      setIsLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const userDocRef = doc(db, 'users', authUser.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setName(userData.name || '');
          setUsername(userData.username || '');
          setBio(userData.bio || '');
          setPhotoURL(userData.photoURL || null);
        } else {
          setError("Kullanıcı verisi bulunamadı.");
        }
      } catch (err) {
        console.error("Profil verisi çekme hatası:", err);
        setError("Veriler yüklenirken bir hata oluştu.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [authUser]);

  // --- 2. Verileri Kaydetme ---
  const handleSave = async () => {
    if (!authUser) return;
    if (!name || !username) {
        setError("İsim ve Kullanıcı Adı alanları zorunludur.");
        return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const userDocRef = doc(db, 'users', authUser.uid);
      
      const updatedData = {
        name: name,
        username: username,
        bio: bio,
        name_lowercase: normalizeText(name),
        username_lowercase: normalizeText(username),
      };

      await updateDoc(userDocRef, updatedData);

      Alert.alert("Başarılı", "Profiliniz güncellendi.");
      router.back(); // Profil sayfasına geri dön

    } catch (err: any) {
      console.error("Profil güncelleme hatası:", err);
      setError("Profil güncellenirken bir hata oluştu: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Dinamik Stiller ---
  const containerStyle = { backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const inputStyle = {
    backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight,
    color: isDark ? COLORS.textDark : COLORS.textLight,
    borderColor: isDark ? COLORS.borderDark : COLORS.borderLight,
  };
  const profileImageUrl = photoURL;
  
  // --- Render ---
  if (isLoading) {
    return (
       <SafeAreaView style={[styles.safeArea, containerStyle, styles.fullScreenCenter]}>
         <ActivityIndicator size="large" color={COLORS.primary} />
       </SafeAreaView>
    );
  }

  if (error && !name) { 
     return (
      <SafeAreaView style={[styles.safeArea, containerStyle, styles.fullScreenCenter]}>
         <MaterialIcons name="error-outline" size={48} color="red" />
         <Text style={[styles.errorText, { color: 'red' }]}>{error}</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]} edges={['bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <Stack.Screen
        options={{
          title: 'Profili Düzenle',
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: containerStyle.backgroundColor },
          headerTitleStyle: { color: textStyle.color, fontWeight: 'bold' },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
              {/* --- DÜZELTME: Renk 'COLORS.primary' (Turuncu) oldu --- */}
              <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
            </Pressable>
          ),
          headerRight: () => <View style={{width: 40}} /> 
        }}
      />
      
      <ScrollView>
        <View style={styles.mainContent}>
          {/* Profil Resmi Bölümü */}
          <View style={styles.avatarContainer}>
            {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.profileImage} />
            ) : (
                <View style={[styles.profileImage, styles.profileImagePlaceholder, {backgroundColor: isDark ? COLORS.elementBgDark : COLORS.elementBgLight}]}>
                    <MaterialIcons name="person" size={60} color={isDark ? COLORS.mutedDark : COLORS.mutedLight} />
                </View>
            )}
            <Pressable onPress={() => Alert.alert("Yakında", "Fotoğraf yükleme özelliği eklenecek.")}>
                <Text style={styles.changePhotoText}>Fotoğrafı Değiştir</Text>
            </Pressable>
          </View>
          
          {/* Hata Mesajı Alanı */}
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Form Alanları */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, textStyle]}>İsim</Text>
                <TextInput
                    style={[styles.input, inputStyle]}
                    placeholder="Adınız Soyadınız"
                    placeholderTextColor={COLORS.mutedLight}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    textContentType="name"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, textStyle]}>Kullanıcı Adı</Text>
                <TextInput
                    style={[styles.input, inputStyle]}
                    placeholder="kullaniciadiniz"
                    placeholderTextColor={COLORS.mutedLight}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    textContentType="username"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, textStyle]}>Bio</Text>
                <TextInput
                    style={[styles.input, styles.textArea, inputStyle]}
                    placeholder="Tavsiye profiliniz için kısa bir açıklama..."
                    placeholderTextColor={COLORS.mutedLight}
                    value={bio}
                    onChangeText={setBio}
                    multiline={true}
                    numberOfLines={4}
                />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Kaydet Butonu (Sayfanın en altı) */}
      <View style={[styles.footer, containerStyle, {borderTopColor: isDark ? COLORS.borderDark : COLORS.borderLight}]}>
        <Pressable 
          // --- DÜZELTME: Renk 'COLORS.primary' (Turuncu) oldu ---
          style={[styles.saveButton, { backgroundColor: isSaving ? COLORS.mutedLight : COLORS.primary }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// --- StyleSheet ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  fullScreenCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  errorText: { 
    color: COLORS.error, 
    textAlign: 'center', 
    marginVertical: 10,
    fontSize: 14,
    fontWeight: '500'
  },
  saveText: { // Bu artık header'da kullanılmıyor
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  mainContent: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {},
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});