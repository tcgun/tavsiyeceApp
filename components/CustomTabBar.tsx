// components/CustomTabBar.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import { useRouter, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS } from '@/constants/theme';

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.backgroundDark,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: Platform.OS === 'ios' ? 0.5 : 1,
    height: Platform.OS === 'ios' ? 60 : 65,
    paddingBottom: 0,
    paddingTop: Platform.OS === 'ios' ? 8 : 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 1000,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  createButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: Platform.OS === 'ios' ? -10 : -15,
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  
  const isActive = (route: string) => {
    if (route === 'index') {
      return pathname === '/(tabs)' || pathname === '/(tabs)/' || pathname === '/';
    }
    if (route === 'explore') {
      return pathname?.includes('/explore');
    }
    if (route === 'profile') {
      return pathname?.includes('/profile') && !pathname?.includes('/profile/');
    }
    return pathname?.includes(route);
  };

  const handleCreatePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/create-recommendation');
  };

  const handleTabPress = (route: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (route === 'index') {
      router.push('/(tabs)');
    } else {
      router.push(`/(tabs)/${route}`);
    }
  };

  const activeColor = '#9ca3af';
  const inactiveColor = '#6b7280';

  return (
    <View style={styles.tabBar}>
      <PlatformPressable
        onPress={() => handleTabPress('index')}
        style={styles.tabButton}
      >
        <IconSymbol 
          size={24} 
          name="house.fill" 
          color={isActive('index') ? activeColor : inactiveColor} 
        />
      </PlatformPressable>

      <PlatformPressable
        onPress={() => handleTabPress('explore')}
        style={styles.tabButton}
      >
        <IconSymbol 
          size={24} 
          name={Platform.OS === 'ios' ? 'safari.fill' : 'explore.fill'} 
          color={isActive('explore') ? activeColor : inactiveColor} 
        />
      </PlatformPressable>

      <View style={styles.createButtonContainer} pointerEvents="box-none">
        <PlatformPressable
          onPress={handleCreatePress}
          style={styles.createButton}
          accessibilityLabel="Tavsiye Ekle"
          accessibilityRole="button"
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </PlatformPressable>
      </View>

      <PlatformPressable
        onPress={() => handleTabPress('profile')}
        style={styles.tabButton}
      >
        <IconSymbol 
          size={24} 
          name="person.fill" 
          color={isActive('profile') ? activeColor : inactiveColor} 
        />
      </PlatformPressable>
    </View>
  );
}

