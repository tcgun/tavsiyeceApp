import { Tabs, useRouter } from 'expo-router';
import React from 'react';

// Bu importların yolunun doğru olduğunu varsayıyorum
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter(); 

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Keşfet',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="create" // app/(tabs)/create.tsx (boş dosya)
        options={{
          title: 'Ekle',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.circle.fill" color={color} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/create-recommendation'); // Gerçek formu aç
          },
        }}
      />

      {/* --- YENİ BİLDİRİMLER SEKMESİ --- */}
      <Tabs.Screen
        name="notifications" // app/(tabs)/notifications.tsx dosyasını hedefliyoruz
        options={{
          title: 'Bildirimler',
           // 'bell.fill' ikon adını kendi ikon setinize göre değiştirmeniz gerekebilir
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bell.fill" color={color} />,
        }}
      />
      {/* --- YENİ BÖLÜM SONU --- */}
      
      <Tabs.Screen
        name="profile" // app/(tabs)/profile.tsx dosyasını hedefliyoruz
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
      
    </Tabs>
  );
}