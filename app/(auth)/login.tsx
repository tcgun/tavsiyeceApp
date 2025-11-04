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
    TextStyle // fontWeight tipi için eklendi
    ,

    useColorScheme,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Firebase Authentication importları
import { signInWithEmailAndPassword } from 'firebase/auth';
// --- DÜZELTME: Doğru yolu kontrol edin ---
import Svg, { Path } from 'react-native-svg'; // SVG ikonları için (expo install react-native-svg yapmayı unutmayın)
import { auth } from '../../firebaseConfig'; // firebaseConfig.ts projenizin kök dizininde olmalı

// Keşfet sayfasından alınan renk paleti
const COLORS = {
  primary: '#14b8a6', // Teal (Keşfet ile aynı)
  backgroundLight: '#F0F2F5', // HTML'den alındı
  backgroundDark: '#101c22',
  textLight: '#333333', // HTML'den
  textDark: '#F0F2F5',
  cardLight: '#ffffff', // Input arka planı için
  cardDark: '#1f2937', // Input arka planı için (gray-800 gibi)
  mutedLight: '#6b7280', // gray-500
  mutedDark: '#9ca3af', // gray-400
  accent: '#4A90E2', // HTML'den (Şifremi unuttum linki)
  separatorLight: '#cfdfe7', // HTML'den
  separatorDark: '#374151', // gray-700
  error: '#ef4444', // red-500
};

// SVG İkonları (Basit Placeholderlar)
// GoogleIcon, FacebookIcon, AppleIcon fonksiyonları aynı kalabilir...
const GoogleIcon = () => (
    <Svg height="24" width="24" viewBox="0 0 24 24">
        <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C4.13 20.53 7.72 23 12 23z" fill="#34A853"/>
        <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.72 1 4.13 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.18-4.53z" fill="#EA4335"/>
        <Path d="M1 1h22v22H1z" fill="none"/>
    </Svg>
);
const FacebookIcon = () => (
     <Svg height="24" width="24" fill="#1877F2" viewBox="0 0 24 24"><Path d="M12 2.04c-5.5 0-10 4.49-10 10s4.5 10 10 10 10-4.49 10-10-4.5-10-10-10zm2.25 10.45h-1.61v4.61h-2.29v-4.61H9v-1.91h1.34V9.69c0-1.18.59-1.89 1.88-1.89h1.61v1.9h-.98c-.37 0-.44.18-.44.43v1.16h1.44l-.2 1.91z"/></Svg>
);
const AppleIcon = ({isDark}: {isDark: boolean}) => (
    <Svg height="24" width="24" fill={isDark ? "#FFF" : "#000"} viewBox="0 0 24 24"><Path d="M19.1 12.72c-.05.05-.11.1-.18.15-1.11 1.07-2.01 2.94-1.98 4.88.03 2.12 1.45 3.99 3.05 4 .1 0 .2-.01.29-.01.07 0 .14-.01.21-.01-1.3 1.91-3.6 2.22-4.75 2.24-.95 0-2.04-.45-3.04-1.26-.95-.75-1.96-1.97-2.86-3.03-1.04-1.2-1.97-2.43-3.13-2.43-.98 0-1.82.89-2.58 1.64-.9.9-1.63 2.12-2.56 3.86-.18.32-.42.53-.7.62-.28.08-.57.03-.81-.13-.33-.23-.5-.61-.5-.98 0-.15.02-.3.05-.44 1.25-3.47 3.36-6.4 6.27-6.43 1.01 0 1.95.53 2.76 1.35.84.85 1.5 1.83 2.75 1.83.17 0 .34-.02.51-.05-1.93-1.26-3.03-3.4-3.01-5.63.02-1.95 1.1-3.81 2.66-4.99 1.07-.8 2.3-1.23 3.69-1.23.1 0 .2.01.3.01s.2.01.3.01c-.18.1-.37.21-.55.33-1.46.92-2.39 2.47-2.42 4.12-.03 2.05 1.26 3.84 3.12 4.78.2.09.41.14.61.14.39 0 .78-.15 1.07-.44.02-.02.04-.04.05-.06.4-.41.63-.98.63-1.57 0-1.11-.74-2.1-1.87-2.56-.16-.07-.3-.18-.36-.33z"/></Svg>
);

// --- Ana Giriş Ekranı ---

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

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
  const socialButtonStyle = {
      backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight,
      borderColor: isDark ? COLORS.separatorDark : COLORS.separatorLight,
  };


  const handleLogin = async () => {
    if (!email || !password) {
      setError("E-posta ve şifre gereklidir.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Giriş başarılı!');
      router.replace('/(tabs)'); // Ana tab navigasyonuna yönlendir
    } catch (err: any) {
      console.error("Giriş hatası:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-password') {
          setError("E-posta veya şifre hatalı.");
      } else if (err.code === 'auth/invalid-email') {
          setError("Geçersiz e-posta formatı.");
      } else {
          setError("Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSignUp = () => {
      // --- DÜZELTME: Obje formatı kullan ---
      // (app/signup.tsx dosyasının var olduğundan emin olun)
      router.push({ pathname: '/signup' });
  };
  const navigateToForgotPassword = () => {
      // --- DÜZELTME: Obje formatı kullan ---
      // (app/forgot-password.tsx dosyasının var olduğundan emin olun)
      router.push({ pathname: '/forgot-password' });
  }

  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Başlık */}
        <View style={styles.header}>
          <Text style={styles.appName}>Tavsiyece</Text>
        </View>

        {/* Sekmeler */}
        <View style={[styles.tabContainer, { borderBottomColor: separatorStyle.backgroundColor }]}>
          <Pressable
            style={[styles.tabButton, tabBorderStyle(activeTab === 'login')]}
            onPress={() => setActiveTab('login')}
          >
            <Text style={[styles.tabText, tabTextStyle(activeTab === 'login')]}>Giriş Yap</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, tabBorderStyle(activeTab === 'signup')]}
            onPress={navigateToSignUp}
          >
            <Text style={[styles.tabText, tabTextStyle(activeTab === 'signup')]}>Kayıt Ol</Text>
          </Pressable>
        </View>

        {/* Form Alanları */}
        <View style={styles.formContainer}>
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
              textContentType="emailAddress" // Klavye türünü ayarla
            />
          </View>

          {/* Şifre */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, textStyle]}>Şifre</Text>
            <View style={[styles.passwordContainer, inputStyle]}>
              <TextInput
                style={[styles.passwordInput, { color: inputStyle.color }]}
                placeholder="••••••••"
                placeholderTextColor={isDark ? COLORS.mutedDark : COLORS.mutedLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                textContentType="password" // Klavye türünü ayarla
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

        {/* Şifremi Unuttum */}
        <Pressable onPress={navigateToForgotPassword}>
          <Text style={styles.forgotPassword}>Şifremi Unuttum?</Text>
        </Pressable>

        {/* Giriş Butonu */}
        <View style={styles.buttonContainer}>
          <Pressable style={styles.loginButton} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Giriş Yap</Text>
            )}
          </Pressable>
        </View>

        {/* Ayırıcı */}
        <View style={styles.separatorContainer}>
          <View style={[styles.separatorLine, separatorStyle]} />
          <Text style={[styles.separatorText, { color: inputIconStyle.color }]}>Veya</Text>
          <View style={[styles.separatorLine, separatorStyle]} />
        </View>

        {/* Sosyal Medya Butonları */}
        <View style={styles.socialContainer}>
          <Pressable style={[styles.socialButton, socialButtonStyle]}>
            <GoogleIcon />
            <Text style={[styles.socialButtonText, textStyle]}>Google ile Devam Et</Text>
          </Pressable>
          <Pressable style={[styles.socialButton, socialButtonStyle]}>
            <FacebookIcon/>
            <Text style={[styles.socialButtonText, textStyle]}>Facebook ile Devam Et</Text>
          </Pressable>
          <Pressable style={[styles.socialButton, socialButtonStyle]}>
            <AppleIcon isDark={isDark} />
            <Text style={[styles.socialButtonText, textStyle]}>Apple ile Devam Et</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- StyleSheet ---
// Styles aynı kalabilir...
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
  },
  forgotPassword: {
    color: COLORS.accent,
    fontSize: 14,
    textAlign: 'right',
    paddingHorizontal: 16,
    textDecorationLine: 'underline',
    marginBottom: 12,
    marginTop: 4,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  socialButtonText: {
    marginLeft: 12,
    fontWeight: '500',
  },
});