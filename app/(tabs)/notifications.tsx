import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import {
    collection,
    doc,
    documentId,
    getDocs,
    limit,
    orderBy,
    query,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    LayoutAnimation,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    UIManager,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

// 🔹 Android için LayoutAnimation aktif et
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Renkler ---
const COLORS = {
  primary: '#13a4ec',
  backgroundLight: '#f6f7f8',
  backgroundDark: '#101c22',
  cardLight: '#ffffff',
  cardDark: '#1a2a33',
  textLight: '#1f2937',
  textDark: '#f3f4f6',
  mutedLight: '#6b7280',
  mutedDark: '#9ca3af',
  borderLight: '#e5e7eb',
  borderDark: '#374151',
};

// --- Tipler ---
type Notification = {
  id: string;
  type: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
  };
  linkPath: '/(tabs)/notifications' | '/recommendation/[id]';
  linkParams: Record<string, string>;
  imageUrl: string | null;
  message: string;
  commentText?: string;
  createdAt: any;
  isRead: boolean;
};

// --- Bildirim Öğesi ---
const NotificationItem = ({
  item,
  isDark,
}: {
  item: Notification;
  isDark: boolean;
}) => {
  const router = useRouter();
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };

  // 🔹 Local state ile okundu durumunu yönet
  const [isRead, setIsRead] = useState(item.isRead);

  // 🔹 Animasyon: isRead değişirse renk geçişi
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [isRead]);

  const containerStyle = {
    backgroundColor: isRead
      ? isDark
        ? COLORS.backgroundDark
        : COLORS.backgroundLight
      : isDark
      ? COLORS.cardDark
      : COLORS.cardLight,
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp || !timestamp.seconds) return 'şimdi';
    const now = new Date();
    const notificationDate = timestamp.toDate();
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'şimdi';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dk önce`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`;
    return notificationDate.toLocaleDateString('tr-TR');
  };

  // 🔹 Firestore okundu güncellemesi
  const markAsRead = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || isRead) return;
      setIsRead(true); // UI anında
      const notifRef = doc(db, 'users', currentUser.uid, 'notifications', item.id);
      await updateDoc(notifRef, { isRead: true });
    } catch (err) {
      console.warn('Bildirim okundu olarak işaretlenemedi:', err);
    }
  };

  // 🔹 Tıklama
  const handlePress = async () => {
    await markAsRead();

    if (item.linkPath === '/recommendation/[id]') {
      router.push({
        pathname: '/recommendation/[id]',
        params: { id: item.linkParams.id },
      });
    } else {
      router.push('/(tabs)/notifications');
    }
  };

  return (
    <Pressable style={[styles.itemContainer, containerStyle]} onPress={handlePress}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.sender.avatar }} style={styles.avatar} />
      </View>

      {/* Metin */}
      <View style={styles.contentContainer}>
        <Text style={[styles.messageText, textStyle]}>
          <Text style={{ fontWeight: 'bold' }}>{item.sender.name}</Text>
          {` ${item.message}`}
          {item.commentText && (
            <Text style={mutedTextStyle}>{`: "${item.commentText}"`}</Text>
          )}
        </Text>
        <Text style={[styles.timeText, mutedTextStyle]}>
          {formatTime(item.createdAt)}
        </Text>
      </View>

      {/* Görsel */}
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
      )}
    </Pressable>
  );
};

// --- Ana Ekran ---
export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Tümünü Okundu Yap
  const markAllAsRead = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || notifications.length === 0) return;

      // UI anında güncelle
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

      // Firestore batch güncellemesi
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.isRead) {
          const notifRef = doc(db, 'users', currentUser.uid, 'notifications', n.id);
          batch.update(notifRef, { isRead: true });
        }
      });
      await batch.commit();
    } catch (err) {
      console.warn('Tüm bildirimler okundu olarak işaretlenemedi:', err);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      setError(null);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError('Bildirimleri görmek için giriş yapmalısınız.');
        setIsLoading(false);
        return;
      }

      try {
        const notifQuery = query(
          collection(db, 'users', currentUser.uid, 'notifications'),
          orderBy('createdAt', 'desc'),
          limit(30)
        );
        const notifSnapshot = await getDocs(notifQuery);

        if (notifSnapshot.empty) {
          setNotifications([]);
          setIsLoading(false);
          return;
        }

        const fetchedNotifs: any[] = [];
        const senderIds = new Set<string>();

        notifSnapshot.forEach(doc => {
          const data = doc.data();
          fetchedNotifs.push({ id: doc.id, ...data });
          if (data.senderId && typeof data.senderId === 'string') senderIds.add(data.senderId);
        });

        const userMap = new Map<string, { name: string; photoURL: string }>();
        if (senderIds.size > 0) {
          const usersQuery = query(
            collection(db, 'users'),
            where(documentId(), 'in', Array.from(senderIds))
          );
          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.forEach(doc => {
            const data = doc.data();
            userMap.set(doc.id, {
              name: data.name || data.username || 'Bilinmeyen',
              photoURL:
                data.photoURL ||
                `https://ui-avatars.com/api/?name=${data.name || 'B'}&background=random`,
            });
          });
        }

        const finalNotifications: Notification[] = fetchedNotifs.map(notif => {
          const senderInfo = userMap.get(notif.senderId);

          let messageText = 'yeni bir bildirim gönderdi.';
          if (notif.type === 'Begeniler') messageText = 'tavsiyeni beğendi.';
          if (notif.type === 'Yorumlar') messageText = 'tavsiyene yorum yaptı';
          if (notif.type === 'Takip') messageText = 'seni takip etmeye başladı.';

          let commentText: string | undefined;
          if (notif.type === 'Yorumlar' && typeof notif.message === 'string' && notif.message.includes(': "')) {
            try {
              commentText = notif.message.split(': "')[1]?.slice(0, -1);
            } catch {}
          }

          let finalLinkPath: Notification['linkPath'] = '/(tabs)/notifications';
          let finalLinkParams: Record<string, string> = {};

          if (notif.link && typeof notif.link === 'string' && (notif.link.startsWith('/recommendation/') || notif.link.startsWith('/tavsiye/'))) {
            const parts = notif.link.split('/');
            const recId = parts[parts.length - 1];
            if (recId) {
              finalLinkPath = '/recommendation/[id]';
              finalLinkParams = { id: recId };
            }
          }

          return {
            id: notif.id,
            type: notif.type,
            sender: {
              id: notif.senderId,
              name: senderInfo?.name || notif.senderName || 'Biri',
              avatar:
                senderInfo?.photoURL ||
                notif.senderPhotoURL ||
                `https://ui-avatars.com/api/?name=${notif.senderName || 'B'}&background=random`,
            },
            linkPath: finalLinkPath,
            linkParams: finalLinkParams,
            imageUrl: notif.imageUrl || null,
            message: messageText,
            commentText: commentText,
            createdAt: notif.createdAt,
            isRead: notif.isRead,
          };
        });

        setNotifications(finalNotifications);
      } catch (err: any) {
        console.error('Bildirimler çekilirken hata:', err);
        setError('Bildirimler yüklenemedi: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const containerStyle = { backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const borderStyle = { borderColor: isDark ? COLORS.borderDark : COLORS.borderLight };

  const renderListContent = () => {
    if (isLoading) return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />;
    if (error) return <Text style={[styles.emptyText, { color: 'red' }]}>{error}</Text>;
    if (notifications.length === 0)
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="notifications-off" size={64} color={COLORS.mutedLight} />
          <Text style={[styles.emptyTitle, textStyle]}>Henüz bir bildirimin yok.</Text>
          <Text style={[styles.emptySubtitle, { color: COLORS.mutedLight }]}>
            Yeni tavsiyeler keşfetmeye ve insanlarla etkileşime geçmeye ne dersin?
          </Text>
        </View>
      );

    return (
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <NotificationItem item={item} isDark={isDark} />}
        ItemSeparatorComponent={() => <View style={[styles.separator, borderStyle]} />}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Bildirimler',
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: containerStyle.backgroundColor },
          headerTitleStyle: { color: textStyle.color, fontWeight: 'bold' },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color={textStyle.color} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={markAllAsRead} style={{ paddingRight: 16 }}>
              <MaterialIcons name="done-all" size={24} color={COLORS.primary} />
            </Pressable>
          ),
        }}
      />
      {renderListContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  itemContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingHorizontal: 16, paddingVertical: 16 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  contentContainer: { flex: 1 },
  messageText: { fontSize: 15, lineHeight: 22 },
  timeText: { fontSize: 14, marginTop: 4 },
  thumbnail: { width: 48, height: 48, borderRadius: 8 },
  separator: { height: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60, gap: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold' },
  emptySubtitle: { fontSize: 15, textAlign: 'center' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16 },
});
