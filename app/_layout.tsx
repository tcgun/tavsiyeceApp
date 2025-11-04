// app/_layout.tsx
import React, { useEffect } from 'react';
// --- Expo Router importları birleştirildi, Slot kaldırıldı ---
import { useColorScheme } from '@/hooks/use-color-scheme'; // Bu hook'un var olduğunu varsayıyoruz
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

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

    console.log('User:', user?.email, 'IsLoading:', isLoading, 'Segments:', segments, 'IsPublicRoute:', isPublicRoute); // Debug log

    if (!user && !isPublicRoute) {
      // Kullanıcı yok VE public route'da değil (örn: /tabs'a gitmeye çalışıyor) -> login'e
      console.log('Redirecting to login...');
      router.replace('/(auth)/login');
    } else if (user && isPublicRoute) {
      // Kullanıcı var VE public route'da (örn: login'de kaldı veya uygulama yeni açıldı) -> tabs'a
      console.log('Redirecting to tabs...');
      router.replace('/(tabs)');
    }
    // Diğer durumlar:
    // - Kullanıcı var ve tabs'da -> OK
    // - Kullanıcı yok ve auth'da -> OK

  }, [user, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#121212' : '#ffffff' }}>
        <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#ffffff' : '#1f2937'} />
      </View>
    );
  }

  // Stack navigator, uygun route'u (Slot yerine) render edecek
  return (
      <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          {/* Expo Router diğer ekranları (örn: recommendation/[id]) otomatik bulur */}
          {/* <Stack.Screen name="recommendation/[id]" options={{ headerShown: true }} /> */}
          {/* <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} /> */}
      </Stack>
  );
};

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <InitialLayout />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </AuthProvider>
  );
}