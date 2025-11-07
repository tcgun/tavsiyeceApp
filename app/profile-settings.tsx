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
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { COLORS } from '../constants/theme';

// --- Ayar Satırı Tipi ---
type SettingsRowProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  isDark: boolean;
};

// --- Ayar Menü Öğesi Tipi ---
type SettingsMenuItemProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isDark: boolean;
  showArrow?: boolean;
};

// --- Ayar Satırı Bileşeni ---
const SettingsRow = ({
  icon,
  title,
  description,
  value,
  onValueChange,
  isDark,
}: SettingsRowProps) => {
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const subtextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  const elementBgStyle = { backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight };
  const borderStyle = { borderColor: isDark ? COLORS.borderDark : COLORS.borderLight };

  return (
    <View style={[styles.rowContainer, borderStyle]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, elementBgStyle]}>
          <MaterialIcons name={icon} size={24} color={textStyle.color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.rowTitle, textStyle]}>{title}</Text>
          <Text style={[styles.rowDescription, subtextStyle]}>{description}</Text>
        </View>
      </View>
      <Switch
        trackColor={{ false: isDark ? COLORS.cardDark : COLORS.cardLight, true: COLORS.primary }}
        thumbColor={isDark ? COLORS.textDark : COLORS.textLight}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
};

// --- Ayar Menü Öğesi Bileşeni ---
const SettingsMenuItem = ({
  icon,
  title,
  subtitle,
  onPress,
  isDark,
  showArrow = true,
}: SettingsMenuItemProps) => {
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const subtextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  const elementBgStyle = { backgroundColor: isDark ? COLORS.cardDark : COLORS.cardLight };
  const borderStyle = { borderColor: isDark ? COLORS.borderDark : COLORS.borderLight };

  return (
    <Pressable style={[styles.menuItemContainer, borderStyle]} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, elementBgStyle]}>
          <MaterialIcons name={icon} size={24} color={textStyle.color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.rowTitle, textStyle]}>{title}</Text>
          {subtitle && <Text style={[styles.rowDescription, subtextStyle]}>{subtitle}</Text>}
        </View>
      </View>
      {showArrow && <MaterialIcons name="chevron-right" size={24} color={subtextStyle.color} />}
    </Pressable>
  );
};

// --- Ana Profil Ayarları Ekranı ---
export default function ProfileSettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Bildirim ayarları
  const [pushNewRecs, setPushNewRecs] = useState(false);
  const [pushLikes, setPushLikes] = useState(false);
  const [pushComments, setPushComments] = useState(false);
  const [pushFollows, setPushFollows] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(false);
  
  // Gizlilik ayarları
  const [profilePrivate, setProfilePrivate] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

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
          if (userData.settings) {
            const settings = userData.settings;
            setPushNewRecs(settings.push?.newRecommendations ?? false);
            setPushLikes(settings.push?.likes ?? false);
            setPushComments(settings.push?.comments ?? false);
            setPushFollows(settings.push?.follows ?? false);
            setEmailUpdates(settings.email?.updates ?? false);
            setProfilePrivate(settings.privacy?.profilePrivate ?? false);
            setShowEmail(settings.privacy?.showEmail ?? false);
          }
        }
      } catch (err) {
        console.error("Ayarlar çekilirken hata:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setIsSaving(true);
    
    const newSettings = {
      push: {
        newRecommendations: pushNewRecs,
        likes: pushLikes,
        comments: pushComments,
        follows: pushFollows,
      },
      email: {
        updates: emailUpdates,
      },
      privacy: {
        profilePrivate: profilePrivate,
        showEmail: showEmail,
      }
    };

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
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

  const handleLogout = async () => {
    Alert.alert(
      "Çıkış Yap",
      "Çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/(auth)/login');
            } catch (err) {
              console.error("Çıkış hatası:", err);
              Alert.alert("Hata", "Çıkış yapılamadı.");
            }
          },
        },
      ]
    );
  };

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
      <StatusBar barStyle="light-content" />
      <Stack.Screen
        options={{
          title: 'Ayarlar',
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: containerStyle.backgroundColor },
          headerTitleStyle: { color: textStyle.color },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color={textStyle.color} />
            </Pressable>
          ),
          headerRight: () => <View style={{ width: 40 }} />,
        }}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          {/* Hesap */}
          <Text style={[styles.sectionTitle, textStyle]}>Hesap</Text>
          <View style={styles.sectionGroup}>
            <SettingsMenuItem
              icon="person"
              title="Profili Düzenle"
              subtitle="İsim, kullanıcı adı ve bio bilgilerini değiştir"
              onPress={() => router.push('/edit-profile')}
              isDark={isDark}
            />
            <SettingsMenuItem
              icon="lock"
              title="Şifre Değiştir"
              subtitle="Hesap şifrenizi güncelleyin"
              onPress={() => Alert.alert("Yakında", "Şifre değiştirme özelliği eklenecek.")}
              isDark={isDark}
            />
          </View>

          {/* Bildirimler */}
          <Text style={[styles.sectionTitle, textStyle, { marginTop: 24 }]}>Bildirimler</Text>
          <View style={styles.sectionGroup}>
            <SettingsRow
              icon="lightbulb"
              title="Yeni Tavsiye Bildirimleri"
              description="Bir tavsiye geldiğinde bildirim al"
              value={pushNewRecs}
              onValueChange={setPushNewRecs}
              isDark={isDark}
            />
            <SettingsRow
              icon="favorite"
              title="Beğeni Bildirimleri"
              description="Tavsiyelerin beğenildiğinde bildirim al"
              value={pushLikes}
              onValueChange={setPushLikes}
              isDark={isDark}
            />
            <SettingsRow
              icon="chat-bubble"
              title="Yorum Bildirimleri"
              description="Tavsiyelerine yorum yapıldığında bildirim al"
              value={pushComments}
              onValueChange={setPushComments}
              isDark={isDark}
            />
            <SettingsRow
              icon="people"
              title="Takip Bildirimleri"
              description="Birisi seni takip ettiğinde bildirim al"
              value={pushFollows}
              onValueChange={setPushFollows}
              isDark={isDark}
            />
            <SettingsRow
              icon="mail"
              title="E-posta Bildirimleri"
              description="Önemli güncellemeler ve haftalık özetler al"
              value={emailUpdates}
              onValueChange={setEmailUpdates}
              isDark={isDark}
            />
          </View>

          {/* Gizlilik */}
          <Text style={[styles.sectionTitle, textStyle, { marginTop: 24 }]}>Gizlilik</Text>
          <View style={styles.sectionGroup}>
            <SettingsRow
              icon="lock-outline"
              title="Gizli Profil"
              description="Profilini sadece takipçilerin görsün"
              value={profilePrivate}
              onValueChange={setProfilePrivate}
              isDark={isDark}
            />
            <SettingsRow
              icon="email"
              title="E-posta Görünürlüğü"
              description="E-posta adresini herkese açık göster"
              value={showEmail}
              onValueChange={setShowEmail}
              isDark={isDark}
            />
          </View>

          {/* Diğer */}
          <Text style={[styles.sectionTitle, textStyle, { marginTop: 24 }]}>Diğer</Text>
          <View style={styles.sectionGroup}>
            <SettingsMenuItem
              icon="help"
              title="Yardım & Destek"
              subtitle="SSS ve destek talebi"
              onPress={() => Alert.alert("Yakında", "Yardım ve destek sayfası eklenecek.")}
              isDark={isDark}
            />
            <SettingsMenuItem
              icon="info"
              title="Hakkında"
              subtitle="Uygulama bilgileri ve versiyon"
              onPress={() => Alert.alert("Tavsiyece", "Versiyon 1.0.0")}
              isDark={isDark}
            />
            <SettingsMenuItem
              icon="file-download"
              title="Verilerimi İndir"
              subtitle="Hesap verilerinizi indirin"
              onPress={() => Alert.alert("Yakında", "Veri indirme özelliği eklenecek.")}
              isDark={isDark}
            />
          </View>

          {/* Çıkış */}
          <View style={styles.sectionGroup}>
            <SettingsMenuItem
              icon="logout"
              title="Çıkış Yap"
              subtitle="Hesabınızdan çıkış yapın"
              onPress={handleLogout}
              isDark={isDark}
              showArrow={false}
            />
          </View>
        </View>
      </ScrollView>

      {/* Kaydet Butonu */}
      <View style={[styles.footer, containerStyle, { borderTopColor: isDark ? COLORS.borderDark : 'transparent' }]}>
        <Pressable 
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
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
    fontSize: 18,
    fontWeight: 'bold',
    paddingBottom: 12,
    paddingTop: 8,
  },
  sectionGroup: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 72,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  menuItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 72,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowDescription: {
    fontSize: 14,
    marginTop: 2,
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

