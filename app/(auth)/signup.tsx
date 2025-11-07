import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Firebase Authentication ve Firestore importları
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

import { COLORS } from '../../constants/theme';
import { normalizeText } from '../../utils/textUtils';

// --- Ana Kayıt Ekranı ---

export default function SignUpScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // Form state'leri
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('signup'); // Aktif sekme

  // Dinamik Stiller
  const containerStyle = { backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const inputStyle = {
    backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight,
    color: isDark ? COLORS.textDark : COLORS.textLight,
  };
  const inputIconStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  const separatorStyle = { backgroundColor: isDark ? COLORS.separatorDark : COLORS.separatorLight };
  const tabBorderStyle = (isActive: boolean) => ({
      borderBottomColor: isActive ? COLORS.primary : 'transparent',
      borderBottomWidth: 3,
  });
  const tabTextStyle = (isActive: boolean): TextStyle => ({
      color: isActive ? (isDark ? COLORS.textDark : COLORS.textLight) : (isDark ? COLORS.mutedDark : COLORS.mutedLight),
      fontWeight: isActive ? 'bold' : 'normal',
  });

  const handleSignUp = async () => {
    // Alanların boş olup olmadığını kontrol et
    if (!name || !username || !email || !password) {
      setError("Tüm alanlar zorunludur.");
      return;
    }
    // Şifre gücünü kontrol et (basit)
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Adım: Firebase Authentication'da yeni kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('Kullanıcı oluşturuldu:', user.uid);

      // 2. Adım: Firestore'da 'users' koleksiyonuna kullanıcı belgesi oluştur
      const userDocRef = doc(db, 'users', user.uid);
      
      // --- DÜZELTME: Normalleştirilmiş alanları ekle ---
      await setDoc(userDocRef, {
        userId: user.uid,
        email: email.toLowerCase(),
        name: name,
        username: username, // Orijinal kullanıcı adını koru
        // Arama için normalleştirilmiş (Türkçe karaktersiz) alanlar:
        name_lowercase: normalizeText(name),
        username_lowercase: normalizeText(username),
        // --- Düzeltme Sonu ---
        bio: `Tavsiye Çemberi'ne yeni katıldım!`, 
        photoURL: null, 
        createdAt: serverTimestamp(), 
      });
      // --- DÜZELTME SONU ---
      
      console.log('Firestore kullanıcı belgesi oluşturuldu.');

      router.replace('/(tabs)'); 
      
    } catch (err: any) {
      console.error("Kayıt hatası:", err.code, err.message);
      if (err.code === 'auth/email-already-in-use') {
        setError('Bu e-posta adresi zaten kullanılıyor.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Geçersiz e-posta adresi formatı.');
      } else if (err.code === 'auth/weak-password') {
        setError('Şifre çok zayıf.');
      } else if (err.code === 'permission-denied') {
         setError('Kullanıcı belgesi oluşturma izni yok. (Firebase Kurallarını kontrol edin)');
      } else {
        setError('Kayıt sırasında bir hata oluştu.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
      router.replace('/(auth)/login'); 
  };


  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Başlık */}
        <View style={styles.header}>
          <Text style={styles.appName}>Tavsiyece</Text>
        </View>

        {/* Sekmeler */}
        <View style={[styles.tabContainer, { borderBottomColor: separatorStyle.backgroundColor }]}>
          <Pressable
            style={[styles.tabButton, tabBorderStyle(activeTab === 'login')]}
            onPress={navigateToLogin} // Giriş Yap'a yönlendir
          >
            <Text style={[styles.tabText, tabTextStyle(activeTab === 'login')]}>Giriş Yap</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, tabBorderStyle(activeTab === 'signup')]}
            onPress={() => setActiveTab('signup')}
          >
            <Text style={[styles.tabText, tabTextStyle(activeTab === 'signup')]}>Kayıt Ol</Text>
          </Pressable>
        </View>

        {/* Form Alanları */}
        <View style={styles.formContainer}>
          {/* İsim */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, textStyle]}>İsim</Text>
            <TextInput
              style={[styles.input, inputStyle]}
              placeholder="Adınız Soyadınız"
              placeholderTextColor={isDark ? COLORS.mutedDark : COLORS.mutedLight}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              textContentType="name"
            />
          </View>
          
          {/* Kullanıcı Adı */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, textStyle]}>Kullanıcı Adı</Text>
            <TextInput
              style={[styles.input, inputStyle]}
              placeholder="kullaniciadiniz (boşluksuz)"
              placeholderTextColor={isDark ? COLORS.mutedDark : COLORS.mutedLight}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              textContentType="username"
            />
          </View>

          {/* E-posta */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, textStyle]}>E-posta</Text>
            <TextInput
              style={[styles.input, inputStyle]}
              placeholder="eposta@adresiniz.com"
              placeholderTextColor={isDark ? COLORS.mutedDark : COLORS.mutedLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />
          </View>

          {/* Şifre */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, textStyle]}>Şifre</Text>
            <View style={[styles.passwordContainer, inputStyle]}>
              <TextInput
                style={[styles.passwordInput, { color: inputStyle.color }]}
                placeholder="En az 6 karakter"
                placeholderTextColor={isDark ? COLORS.mutedDark : COLORS.mutedLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                textContentType="newPassword" // Yeni şifre için
              />
              <Pressable onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeIcon}>
                <MaterialIcons
                  name={passwordVisible ? 'visibility-off' : 'visibility'}
                  size={24}
                  color={inputIconStyle.color}
                />
              </Pressable>
            </View>
          </View>
        </View>

         {/* Hata Mesajı */}
         {error && (
            <Text style={styles.errorText}>{error}</Text>
         )}

        {/* Kayıt Ol Butonu */}
        <View style={styles.buttonContainer}>
          <Pressable style={styles.loginButton} onPress={handleSignUp} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Kayıt Ol</Text>
            )}
          </Pressable>
        </View>

         {/* Ayırıcı (Opsiyonel, login sayfasındaki gibi) */}
         <View style={styles.separatorContainer}>
          <View style={[styles.separatorLine, separatorStyle]} />
          <Text style={[styles.separatorText, { color: inputIconStyle.color }]}>Veya</Text>
          <View style={[styles.separatorLine, separatorStyle]} />
        </View>

        {/* Sosyal Medya Butonları (Şimdilik işlevsiz) */}
        <View style={styles.socialContainer}>
           <Text style={[styles.socialButtonText, textStyle, {textAlign: 'center', marginBottom: 16, fontSize: 12}]}>
             Sosyal medya ile kayıt olarak daha hızlı ilerleyebilirsiniz.
           </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- StyleSheet ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    marginBottom: 32,
  },
  appName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 13,
    paddingTop: 16,
  },
  tabText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  inputGroup: {},
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 0,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    height: 56,
  },
  passwordInput: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 10,
    fontSize: 16,
    height: '100%',
  },
  eyeIcon: {
    paddingHorizontal: 16,
  },
   errorText: {
      color: COLORS.error,
      textAlign: 'center',
      marginTop: 8,
      marginHorizontal: 16,
      fontSize: 14,
      fontWeight: '500'
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8, // Hata mesajı ile buton arasına boşluk
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  socialContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  socialButtonText: {
    marginLeft: 12,
    fontWeight: '500',
  },
});