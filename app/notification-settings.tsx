import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Firebase importları (updateDoc kaldırıldı)
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// Renkler (HTML'den)
const COLORS = {
  primary: '#13a4ec',
  backgroundLight: '#f6f7f8',
  backgroundDark: '#101c22',
  secondary: '#607D8B', // <-- DÜZELTME: Eksik renk eklendi
  textLight: '#0d171b',
  textDark: '#f6f7f8',
  subtextLight: '#4c809a',
  subtextDark: '#a3b3bd',
  elementBgLight: '#e7eff3', // İkon arkaplanı
  elementBgDark: '#1c2a32',
  borderLight: '#e7eff3',
  borderDark: '#1c2a32',
};

// --- Ayar Satırı Tipi ---
type SettingsRowProps = {
  icon: keyof typeof MaterialIcons.glyphMap; // İkon adı
  title: string;
  description: string;
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  isDark: boolean;
};

// --- Ayrı Bileşen: Ayar Satırı (Kodu temiz tutmak için) ---
const SettingsRow = ({
  icon,
  title,
  description,
  value,
  onValueChange,
  isDark,
}: SettingsRowProps) => {
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const subtextStyle = { color: isDark ? COLORS.subtextDark : COLORS.subtextLight };
  const elementBgStyle = { backgroundColor: isDark ? COLORS.elementBgDark : COLORS.elementBgLight };
  const borderStyle = { borderColor: isDark ? COLORS.borderDark : COLORS.borderLight };

  return (
    <View style={[styles.rowContainer, borderStyle]}>
      <View style={styles.rowLeft}>
        {/* İkon */}
        <View style={[styles.iconContainer, elementBgStyle]}>
          <MaterialIcons name={icon} size={24} color={textStyle.color} />
        </View>
        {/* Metinler */}
        <View style={styles.textContainer}>
          <Text style={[styles.rowTitle, textStyle]}>{title}</Text>
          <Text style={[styles.rowDescription, subtextStyle]}>{description}</Text>
        </View>
      </View>
      {/* Switch */}
      <Switch
        trackColor={{ false: isDark ? COLORS.elementBgDark : COLORS.elementBgLight, true: COLORS.primary }}
        thumbColor={isDark ? COLORS.textDark : COLORS.textLight}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
};

// --- Ana Ayarlar Ekranı ---
export default function NotificationSettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // State'ler
  const [isLoading, setIsLoading] = useState(true); // Veri çekme
  const [isSaving, setIsSaving] = useState(false); // Kaydetme
  
  // Ayar state'leri
  const [pushNewRecs, setPushNewRecs] = useState(false);
  const [pushLikes, setPushLikes] = useState(false);
  const [pushComments, setPushComments] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(false);

  // --- Ayarları Çekme ---
  useEffect(() => {
    const fetchSettings = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Hata", "Ayarları görmek için giriş yapmalısınız.");
        setIsLoading(false);
        return;
      }
      
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          // 'settings' alanı varsa, state'leri güncelle
          if (userData.settings) {
            const settings = userData.settings;
            setPushNewRecs(settings.push?.newRecommendations ?? false);
            setPushLikes(settings.push?.likes ?? false);
            setPushComments(settings.push?.comments ?? false);
            setEmailUpdates(settings.email?.updates ?? false);
          }
          // 'settings' alanı yoksa, state'ler 'false' olarak kalır
        }
      } catch (err) {
        console.error("Ayarlar çekilirken hata:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  // --- Ayarları Kaydetme ---
  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setIsSaving(true);
    
    // Kaydedilecek yeni ayar objesi
    const newSettings = {
      push: {
        newRecommendations: pushNewRecs,
        likes: pushLikes,
        comments: pushComments,
      },
      email: {
        updates: emailUpdates,
      }
    };

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      // 'settings' alanını güncelle (setDoc ve merge ile)
      await setDoc(userDocRef, { settings: newSettings }, { merge: true });
      
      Alert.alert("Başarılı", "Ayarlarınız kaydedildi.");
      router.back();

    } catch (err: any) {
      console.error("Ayarlar kaydedilirken hata:", err);
      Alert.alert("Hata", "Ayarlar kaydedilemedi: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Dinamik Stiller
  const containerStyle = { backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };

  if (isLoading) {
    return (
       <SafeAreaView style={[styles.safeArea, containerStyle, styles.fullScreenCenter]}>
         <ActivityIndicator size="large" color={COLORS.primary} />
       </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]} edges={['bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <Stack.Screen
        options={{
          title: 'Bildirim Ayarları',
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: containerStyle.backgroundColor },
          headerTitleStyle: { color: textStyle.color },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color={textStyle.color} />
            </Pressable>
          ),
          headerRight: () => <View style={{ width: 40 }} />, // Başlığı ortalamak için boş view
        }}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          {/* Anlık Bildirimler */}
          <Text style={[styles.sectionTitle, textStyle]}>Anlık Bildirimler</Text>
          <View style={styles.sectionGroup}>
            <SettingsRow
              icon="lightbulb"
              title="Yeni Tavsiye Bildirimleri"
              description="Bir tavsiye geldiğinde bildirim al."
              value={pushNewRecs}
              onValueChange={setPushNewRecs}
              isDark={isDark}
            />
            <SettingsRow
              icon="favorite"
              title="Beğeni Bildirimleri"
              description="Tavsiyelerin beğenildiğinde bildirim al."
              value={pushLikes}
              onValueChange={setPushLikes}
              isDark={isDark}
            />
            <SettingsRow
              icon="chat-bubble"
              title="Yorum Bildirimleri"
              description="Tavsiyelerine yorum yapıldığında bildirim al."
              value={pushComments}
              onValueChange={setPushComments}
              isDark={isDark}
            />
          </View>

          {/* E-posta Bildirimleri */}
          <Text style={[styles.sectionTitle, textStyle, { marginTop: 16 }]}>E-posta Bildirimleri</Text>
          <View style={styles.sectionGroup}>
            <SettingsRow
              icon="mail"
              title="E-posta Bildirimleri"
              description="Önemli güncellemeler ve haftalık özetler al."
              value={emailUpdates}
              onValueChange={setEmailUpdates}
              isDark={isDark}
            />
          </View>
        </View>
      </ScrollView>

      {/* Kaydet Butonu (Sticky Footer) */}
      <View style={[styles.footer, containerStyle, { borderTopColor: isDark ? COLORS.borderDark : 'transparent' }]}>
        <Pressable 
          style={[styles.saveButton, { backgroundColor: isSaving ? COLORS.secondary : COLORS.primary }]}
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
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1, // Bu, footer'ın alta itilmesini sağlar
  },
  fullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    paddingBottom: 12,
    paddingTop: 20,
  },
  sectionGroup: {
    borderRadius: 12, // Kenarları yuvarlak grup
    overflow: 'hidden', // İçerideki border'ları maskele
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16, // px-4
    minHeight: 80, // min-h-[72px] + padding
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // gap-4
    flex: 1, // Esnek ol, Switch'e yer bırak
  },
  iconContainer: {
    width: 48, // size-12
    height: 48,
    borderRadius: 8, // rounded-lg
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1, // Metinlerin sığmazsa alta kaymasını sağla
    paddingRight: 8, // Switch'e değmesin
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  // Footer
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    width: '100%',
    height: 56, // py-4
    borderRadius: 12, // rounded-xl
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});