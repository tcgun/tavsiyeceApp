import { MaterialIcons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS } from '@/constants/theme';

// Styles tanımı
const styles = StyleSheet.create({
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

// Ortada Tavsiye Ekleme Butonu Bileşeni
function CreateButton(props: any) {
  const router = useRouter();
  
  const handlePress = (e?: any) => {
    e?.stopPropagation?.();
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      router.push('/create-recommendation' as any);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };
  
  const handlePressIn = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    props.onPressIn?.();
  };
  
  const { onPress: _onPress, ...restProps } = props;
  
  return (
    <View style={styles.createButtonContainer} pointerEvents="box-none">
      <PlatformPressable
        {...restProps}
        onPress={handlePress}
        onPressIn={handlePressIn}
        style={styles.createButton}
        accessibilityLabel="Tavsiye Ekle"
        accessibilityRole="button"
      >
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </PlatformPressable>
    </View>
  );
}

// Explore Tab Button Component
function ExploreTabButton(props: any) {
  const router = useRouter();
  const pathname = usePathname();
  const isCurrentlyOnExplore = pathname?.includes('/explore');

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (isCurrentlyOnExplore) {
      router.setParams({ clearSearch: 'true' });
    } else {
      router.push('/(tabs)/explore?clearSearch=true');
    }
  };

  return (
    <HapticTab
      {...props}
      onPress={handlePress}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      lazy={false}
      screenOptions={{
        tabBarActiveTintColor: '#9ca3af', // Grimsi aktif renk
        tabBarInactiveTintColor: '#6b7280', // Grimsi pasif renk
        tabBarShowLabel: false, // Altındaki yazıları kaldır
        animationEnabled: false, // Tab geçişlerinde animasyon yok
        tabBarStyle: {
          backgroundColor: COLORS.backgroundDark, // Her zaman koyu mor
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          borderTopWidth: Platform.OS === 'ios' ? 0.5 : 1,
          height: Platform.OS === 'ios' ? 60 : 65,
          paddingBottom: 0, // iOS ve Android'de alt kısıma sıfır
          paddingTop: Platform.OS === 'ios' ? 8 : 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ color }) => (
            <IconSymbol 
              size={24} 
              name={(Platform.OS === 'ios' ? 'safari.fill' : 'explore.fill') as any} 
              color={color} 
            />
          ),
          tabBarButton: (props) => <ExploreTabButton {...props} />,
        }}
      />

      <Tabs.Screen
        name="create-recommendation"
        options={{
          tabBarButton: (props) => <CreateButton {...props} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
      
    </Tabs>
  );
}