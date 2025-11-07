import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { useRouter, usePathname } from 'expo-router';
import { db } from '../firebaseConfig';
import { COLORS } from '../constants/theme';
import { FollowUser } from '../types';

type FollowListItemProps = {
  user: FollowUser;
  isDark: boolean;
  isFollowing: boolean;
  currentUserId: string | undefined;
};

export const FollowListItem = ({
  user,
  isDark,
  isFollowing,
  currentUserId,
}: FollowListItemProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [followingState, setFollowingState] = useState(isFollowing);
  const [isLoading, setIsLoading] = useState(false);

  // isFollowing prop'u değiştiğinde state'i güncelle
  useEffect(() => {
    setFollowingState(isFollowing);
  }, [isFollowing]);

  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };

  const handleUserPress = () => {
    // Takipçiler/takip sayfasından profil sayfasına geçerken navigation'ı düzgün yönet
    const isInFollowersOrFollowing = pathname?.includes('/followers') || pathname?.includes('/following');
    
    if (isInFollowersOrFollowing) {
      // Takipçiler/takip sayfasındaysak, direkt profil sayfasına git
      // replace kullanarak takipçiler sayfasını stack'ten çıkar
      router.replace({
        pathname: '/profile/[id]',
        params: { id: user.id },
      });
    } else {
      // Normal sayfalardan profil sayfasına geçiyorsak direkt git
      router.push({
        pathname: '/profile/[id]',
        params: { id: user.id },
      });
    }
  };

  const handleFollowToggle = async (e?: any) => {
    // Event propagation'ı durdur - profil sayfasına gitmesin
    if (e) {
      e.stopPropagation();
    }
    if (!currentUserId || currentUserId === user.id) return;

    setIsLoading(true);

    const followingRef = doc(db, 'users', currentUserId, 'following', user.id);
    const followerRef = doc(db, 'users', user.id, 'followers', currentUserId);

    try {
      const batch = writeBatch(db);

      if (followingState) {
        batch.delete(followingRef);
        batch.delete(followerRef);
      } else {
        const timestamp = serverTimestamp();
        batch.set(followingRef, { createdAt: timestamp });
        batch.set(followerRef, { createdAt: timestamp });
      }
      await batch.commit();
      setFollowingState(!followingState);
    } catch (err) {
      console.error('Takip etme/bırakma hatası:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderButton = () => {
    if (!currentUserId || currentUserId === user.id) {
      return <View style={styles.followButtonBase} />; // Boş yer tutucu
    }

    if (isLoading) {
      return (
        <View
          style={[
            styles.followButtonBase,
            isDark ? styles.followingButtonDark : styles.followingButtonLight,
          ]}
        >
          <ActivityIndicator
            size="small"
            color={isDark ? COLORS.textDark : COLORS.textLight}
          />
        </View>
      );
    }

    if (followingState) {
      return (
        <Pressable
          style={[
            styles.followButtonBase,
            isDark ? styles.followingButtonDark : styles.followingButtonLight,
          ]}
          onPress={(e) => handleFollowToggle(e)}
        >
          <Text
            style={[
              styles.followButtonText,
              isDark ? styles.followingTextDark : styles.followingTextLight,
            ]}
          >
            Takip Ediliyor
          </Text>
        </Pressable>
      );
    } else {
      return (
        <Pressable 
          style={[styles.followButtonBase, styles.followButton]} 
          onPress={(e) => handleFollowToggle(e)}
        >
          <Text style={styles.followButtonText}>Takip Et</Text>
        </Pressable>
      );
    }
  };

  return (
    <Pressable 
      style={styles.followItemContainer}
      onPress={handleUserPress}
    >
      <View style={styles.followItemUser}>
        <Image source={{ uri: user.avatar }} style={styles.avatarMedium} />
        <View>
          <Text style={[styles.followName, textStyle]}>{user.name}</Text>
          <Text style={[styles.followUsername, mutedTextStyle]}>@{user.username}</Text>
        </View>
      </View>
      <View 
        onStartShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
      >
        {renderButton()}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  followItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  followItemUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMedium: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
    backgroundColor: '#e0e0e0',
  },
  followName: {
    fontWeight: '600',
  },
  followUsername: {
    fontSize: 14,
  },
  followButtonBase: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  followButton: {
    backgroundColor: COLORS.primary,
  },
  followingButtonLight: {
    backgroundColor: '#e5e7eb',
  },
  followingButtonDark: {
    backgroundColor: '#374151',
  },
  followingTextLight: {
    color: '#1f2937',
  },
  followingTextDark: {
    color: '#d1d5db',
  },
});

