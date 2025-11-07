// app/_layout.tsx
import React, { useEffect } from 'react';
// --- Expo Router importları birleştirildi, Slot kaldırıldı ---
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

const InitialLayout = () => {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';

  // --- DÜZELTİLMİŞ useEffect ---
  useEffect(() => {
    if (isLoading) return; // Yükleme bitene kadar bekle

    const inAuthGroup = segments[0] === '(auth)';
    // Kök dizinde miyiz (ilk eleman yok mu) veya auth grubunda mıyız?
    const isPublicRoute = !segments[0] || inAuthGroup;

    if (!user && !isPublicRoute) {
      router.replace('/(auth)/login');
    } else if (user && isPublicRoute) {
      router.replace('/(tabs)');
    }
    // Diğer durumlar:
    // - Kullanıcı var ve tabs'da -> OK
    // - Kullanıcı yok ve auth'da -> OK

  }, [user, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.backgroundDark }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  // Stack navigator, uygun route'u (Slot yerine) render edecek
  return (
      <Stack 
        screenOptions={{ 
          headerShown: false,
          animation: 'none', // Tüm sayfalar için animasyon yok
        }}
      >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen 
            name="profile/[id]" 
            options={{ 
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="create-recommendation" 
            options={{ 
              headerShown: false,
            }} 
          />
          {/* Expo Router diğer ekranları (örn: recommendation/[id]) otomatik bulur */}
          {/* <Stack.Screen name="recommendation/[id]" options={{ headerShown: true }} /> */}
          {/* <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} /> */}
      </Stack>
  );
};

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? 'light';

  // Özelleştirilmiş Theme (her zaman koyu mor)
  const CustomTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: COLORS.backgroundDark,
      card: COLORS.cardDark,
      text: COLORS.textDark,
      border: COLORS.borderDark,
    },
  };

  return (
    <AuthProvider>
      <ThemeProvider value={CustomTheme}>
        <InitialLayout />
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}