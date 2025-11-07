// app/profile/[id]/followers.tsx

import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { CustomTabBar } from '../../../components/CustomTabBar';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../../firebaseConfig';
import { COLORS } from '../../../constants/theme';
import { FollowUser } from '../../../types';
import { FollowListItem } from '../../../components/FollowListItem';
import { getFollowers } from '../../../services/firebase/userService';
import { doc, getDoc } from 'firebase/firestore';

export default function FollowersScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { id: viewedUserId } = useLocalSearchParams<{ id: string }>();
  const currentUserId = auth.currentUser?.uid;

  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      if (!viewedUserId) return;
      
      setIsLoading(true);
      try {
        // Tüm takipçileri çek
        const followersList = await getFollowers(viewedUserId, 100);
        setFollowers(followersList);

        // Mevcut kullanıcının bu takipçileri takip edip etmediğini kontrol et
        if (currentUserId) {
          const followingStatusMap = new Map<string, boolean>();
          await Promise.all(
            followersList.map(async (user) => {
              if (user.id === currentUserId) return;
              const followingRef = doc(db, 'users', currentUserId, 'following', user.id);
              const followingSnap = await getDoc(followingRef);
              followingStatusMap.set(user.id, followingSnap.exists());
            })
          );
          setFollowingMap(followingStatusMap);
        }
      } catch (error) {
        console.error('Takipçiler çekme hatası:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [viewedUserId, currentUserId]);

  const containerStyle = { backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };

  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Takipçiler',
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

      {isLoading ? (
        <View style={[styles.centerContainer, containerStyle]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 80 : 85, paddingHorizontal: 16, paddingTop: 16 }}
        >
          {followers.length > 0 ? (
            followers.map((user) => (
              <View key={user.id} style={{ marginBottom: 16 }}>
                <FollowListItem
                  user={user}
                  isDark={isDark}
                  isFollowing={followingMap.get(user.id) || false}
                  currentUserId={currentUserId}
                />
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, mutedTextStyle]}>Henüz takipçi yok.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <CustomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

