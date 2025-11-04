import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebaseConfig';

// Renkler
const COLORS = {
  primary: '#ff7a5c', 
  backgroundLight: '#f5f5f5',
  backgroundDark: '#1a1a1a',
  textLight: '#1a1a1a',
  textDark: '#f5f5f5',
  mutedLight: '#6b7280',
  mutedDark: '#9ca3af',
};

// --- Tipler ---
type Recommendation = {
  id: string;
  category: string;
  title: string;
  text: string;
  userId: string;
  image: string | null;
  rating: number | null;
};
type User = {
  name: string;
  username: string;
  photoURL: string | null;
  bio: string;
};
type Comment = {
  id: string;
  text: string;
  createdAt: any; 
  userId: string; 
  user: {
    name: string;
    avatar: string;
  };
};

// --- Alt Bileşenler ---
const StarRating = ({ rating, isDark }: { rating: number, isDark: boolean }) => {
  const stars = [];
  const maxRating = 5;
  const starColor = COLORS.primary;
  const emptyStarColor = isDark ? COLORS.mutedDark : COLORS.mutedLight;
  for (let i = 1; i <= maxRating; i++) {
    if (i <= rating) {
      stars.push(<MaterialIcons key={i} name="star" size={20} color={starColor} />);
    } else if (i - 0.5 <= rating) {
      stars.push(<MaterialIcons key={i} name="star-half" size={20} color={starColor} />);
    } else {
      stars.push(<MaterialIcons key={i} name="star-border" size={20} color={emptyStarColor} />);
    }
  }
  return (
    <View style={styles.rating}>
      <View style={{ flexDirection: 'row' }}>{stars}</View>
      <Text style={[styles.ratingText, { color: isDark ? COLORS.textDark : COLORS.textLight }]}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
};
const CommentItem = ({ comment, isDark }: { comment: Comment, isDark: boolean }) => {
  const router = useRouter();
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  return (
    <Pressable style={styles.commentItem} onPress={() => router.push({ pathname: '/profile/[id]', params: { id: comment.userId } })}>
      <Image source={{ uri: comment.user.avatar }} style={styles.avatarSmall} />
      <View style={styles.commentContent}>
        <Text style={[styles.commentName, textStyle]}>{comment.user.name}</Text>
        <Text style={[styles.commentText, mutedTextStyle]}>{comment.text}</Text>
      </View>
    </Pressable>
  );
};


// --- Ana Ekran Bileşeni ---
export default function RecommendationDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { user: authUser } = useAuth(); 
  const currentUserId = authUser?.uid; // Giriş yapan kullanıcının ID'si
  
  const { id, focusComment } = useLocalSearchParams<{ id: string, focusComment?: string }>();
  
  const scrollViewRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);

  // State'ler
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recommender, setRecommender] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false); 
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);

  const [isLiked, setIsLiked] = useState(false); 
  const [likeCount, setLikeCount] = useState(0); 
  const [isLiking, setIsLiking] = useState(false); 

  const fetchCurrentUserProfile = useCallback(async () => {
    if (authUser) {
      const userRef = doc(db, 'users', authUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setCurrentUserProfile(userSnap.data() as User);
      }
    }
  }, [authUser]); 

  // --- GÜNCELLENMİŞ useEffect: Bağımlılıklar Tamam ---
  useEffect(() => {
    if (!id) {
      setError('Tavsiye ID\'si bulunamadı.');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await fetchCurrentUserProfile(); 

        // 1. Tavsiyeyi çek
        const recRef = doc(db, 'recommendations', id);
        const recSnap = await getDoc(recRef);

        if (!recSnap.exists()) {
          setError('Tavsiye bulunamadı.');
          setIsLoading(false);
          return;
        }
        const recData = { id: recSnap.id, ...recSnap.data() } as Recommendation;
        setRecommendation(recData);

        // 2. Tavsiyeyi yapanı çek
        if (recData.userId) {
            const userRef = doc(db, 'users', recData.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                setRecommender(userSnap.data() as User);
            }
        } else {
           console.warn(`Recommendation ${id} has invalid or missing userId: ${recData.userId}`);
        }

        // 3. Yorumları Çek
        const commentsRef = collection(db, 'recommendations', id, 'comments');
        const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));
        const commentsSnapshot = await getDocs(commentsQuery);
        
        const fetchedCommentsData: any[] = [];
        const commentUserIDs = new Set<string>();
        commentsSnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedCommentsData.push({ id: doc.id, ...data });
           if (data.userId) {
            commentUserIDs.add(data.userId);
          }
        });

        // 4. Yorumcuları çek
        const userMap = new Map<string, { name: string, username: string, photoURL: string }>();
        if (commentUserIDs.size > 0) {
          const usersQuery = query(
            collection(db, 'users'),
            where(documentId(), 'in', Array.from(commentUserIDs))
          );
          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.forEach((doc) => {
            const data = doc.data();
            userMap.set(doc.id, {
              name: data.name || '', 
              username: data.username || 'bilinmeyen',
              photoURL: data.photoURL || '',
            });
          });
        }

        // 5. Verileri birleştir
        const finalComments: Comment[] = fetchedCommentsData.map(comment => {
           const userInfo = userMap.get(comment.userId); 
           let finalName = 'Bilinmeyen Kullanıcı';
           if (userInfo) {
             if (userInfo.name) { finalName = userInfo.name; }
             else if (userInfo.username && userInfo.username !== 'bilinmeyen') { finalName = `@${userInfo.username}`; }
           }
           const avatar = userInfo?.photoURL || `https://ui-avatars.com/api/?name=${userInfo?.name || userInfo?.username || 'Y'}&background=random`;

           let createdAtString = 'şimdi';
           if (comment.createdAt && typeof comment.createdAt.toDate === 'function') {
              try {
                createdAtString = comment.createdAt.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
              } catch {}
           }

           return {
             id: comment.id,
             text: comment.text || '',
             createdAt: createdAtString,
             userId: comment.userId, 
             user: { name: finalName, avatar: avatar }
           };
        });
        setComments(finalComments);

        // 6. Beğeni Durumunu Çek
        const likesRef = collection(db, 'recommendations', id, 'likes');
        const likesSnap = await getDocs(likesRef);
        setLikeCount(likesSnap.size);
        
        if(currentUserId) {
            const myLikeRef = doc(db, 'recommendations', id, 'likes', currentUserId);
            const myLikeSnap = await getDoc(myLikeRef);
            setIsLiked(myLikeSnap.exists());
        }

      } catch (err: any) {
        console.error("Detay sayfası veri çekme hatası:", err.message);
        setError("Veri yüklenirken bir hata oluştu.");
      } finally {
        setIsLoading(false);
        if (focusComment === 'true') {
          setTimeout(() => {
              commentInputRef.current?.focus(); 
              scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 200); 
        }
      }
    };
    
    fetchData();
  }, [id, authUser, focusComment, fetchCurrentUserProfile, currentUserId]); 
  
  // Yorum Gönderme Fonksiyonu
  const handleSendComment = async () => {
    if (!authUser || !currentUserProfile) {
        Alert.alert("Hata", "Yorum yapmak için giriş yapmalısınız.");
        return;
    }
    if (!newComment.trim()) { 
        Alert.alert("Hata", "Yorum boş olamaz.");
        return;
    }
    if (!id) return; 

    setIsSubmittingComment(true); 

    try {
        const commentData = {
            text: newComment.trim(),
            userId: authUser.uid,
            createdAt: serverTimestamp(), 
        };
        
        const commentsRef = collection(db, 'recommendations', id, 'comments');
        const docRef = await addDoc(commentsRef, commentData);
        
        const newCommentForState: Comment = {
            id: docRef.id,
            text: commentData.text,
            createdAt: 'şimdi',
            userId: authUser.uid,
            user: {
                name: currentUserProfile.name || `@${currentUserProfile.username}`,
                avatar: currentUserProfile.photoURL || `https://ui-avatars.com/api/?name=${currentUserProfile.name || currentUserProfile.username}&background=random`,
            }
        };

        setComments(prevComments => [newCommentForState, ...prevComments]);
        setNewComment('');

    } catch (err: any) {
        console.error("Yorum gönderme hatası:", err);
        Alert.alert("Hata", "Yorumunuz gönderilemedi: " + err.message);
    } finally {
        setIsSubmittingComment(false);
    }
  };

  // Beğenme Fonksiyonu
  const handleLikeToggle = async () => {
      if (!id || !currentUserId) {
          Alert.alert("Hata", "Beğeni yapmak için giriş yapmalısınız.");
          return;
      }
      
      setIsLiking(true); 
      
      const likeRef = doc(db, 'recommendations', id, 'likes', currentUserId);
      
      try {
          if (isLiked) {
              await deleteDoc(likeRef);
              setIsLiked(false);
              setLikeCount(prev => prev - 1);
          } else {
              await setDoc(likeRef, {
                  createdAt: serverTimestamp()
              });
              setIsLiked(true);
              setLikeCount(prev => prev + 1);
          }
      } catch (err: any) {
          console.error("Beğeni hatası:", err);
          Alert.alert("Hata", "İşlem yapılırken bir sorun oluştu.");
      } finally {
          setIsLiking(false); 
      }
  };

  // --- Dinamik Stiller ---
  const containerStyle = { backgroundColor: isDark ? COLORS.backgroundDark : COLORS.backgroundLight };
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  const inputBgStyle = { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' };
  const borderColor = { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' };

  // --- Render Fonksiyonları (Yükleme/Hata) ---
  if (isLoading) {
    return (
      <View style={[styles.fullScreenCenter, containerStyle]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, mutedTextStyle]}>Yükleniyor...</Text>
      </View>
    );
  }
  if (error || !recommendation) {
    return (
      <View style={[styles.fullScreenCenter, containerStyle]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Stack.Screen options={{ title: 'Hata' }} />
        <MaterialIcons name="error-outline" size={48} color="red" />
        <Text style={[styles.errorText, { color: 'red' }]}>{error}</Text>
      </View>
    );
  }

  const recommenderName = recommender?.name || 'Kullanıcı';
  const recommenderUsername = recommender?.username ? `@${recommender.username}` : '...';
  const recommenderAvatar = recommender?.photoURL || `https://ui-avatars.com/api/?name=${recommenderName}&background=random`;

  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]} edges={['bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen
        options={{
          title: 'Tavsiye',
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
              <MaterialIcons name="arrow-back" size={24} color={textStyle.color} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable style={{ padding: 4 }}>
              <MaterialIcons name="share" size={24} color={textStyle.color} />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.scrollContent}
          ref={scrollViewRef} 
        >
          <ImageBackground
            source={recommendation.image ? { uri: recommendation.image } : undefined}
            style={[styles.heroImage, !recommendation.image && styles.imagePlaceholder]}
            resizeMode="cover"
          >
            {!recommendation.image && (
              <MaterialIcons name="image" size={64} color={mutedTextStyle.color} />
            )}
          </ImageBackground>

          <View style={styles.contentPadding}>
            <View>
              <Text style={[styles.title, textStyle]}>{recommendation.title}</Text>
              <Text style={[styles.description, mutedTextStyle]}>{recommendation.text}</Text>
            </View>

            <View style={styles.metaContainer}>
              <Pressable style={styles.recommender} onPress={() => router.push({ pathname: '/profile/[id]', params: { id: recommendation.userId } })}>
                <Image source={{ uri: recommenderAvatar }} style={styles.avatarLarge} />
                <View>
                  <Text style={[styles.recommenderName, textStyle]}>{recommenderName}</Text>
                  <Text style={[styles.recommenderUser, mutedTextStyle]}>{recommenderUsername}</Text>
                </View>
              </Pressable>
              
              {recommendation.rating != null && recommendation.rating >= 0 ? (
                <StarRating rating={recommendation.rating} isDark={isDark} />
              ) : (
                <View style={styles.rating}>
                  <Text style={mutedTextStyle}>Puanlanmamış</Text>
                </View>
              )}
            </View>

            {/* --- GÜNCELLENMİŞ "Beğen" BUTONU --- */}
            <Pressable 
              style={[
                styles.favoriteButton, 
                isLiked && { backgroundColor: isDark ? COLORS.mutedDark : COLORS.mutedLight }
              ]}
              onPress={handleLikeToggle}
              disabled={isLiking}
            >
              {isLiking ? (
                <ActivityIndicator color={isLiked ? COLORS.primary : "#FFFFFF"} />
              ) : (
                <>
                  <MaterialIcons 
                    name={isLiked ? 'favorite' : 'favorite-border'} 
                    size={24} 
                    color={isLiked ? COLORS.primary : "#FFFFFF"} 
                  />
                  <Text style={[styles.favoriteButtonText, isLiked && {color: textStyle.color}]}>
                    {isLiked ? 'Beğenildi' : 'Beğen'} 
                    {likeCount > 0 && ` (${likeCount})`} 
                  </Text>
                </>
              )}
            </Pressable>
            {/* --- GÜNCELLEME SONU --- */}


            {/* Yorumlar */}
            <View style={[styles.commentsSection, borderColor]}>
              <Text style={[styles.commentsTitle, textStyle]}>
                Yorumlar ({comments.length})
              </Text>
              <View style={styles.commentsList}>
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} isDark={isDark} />
                  ))
                ) : (
                  <Text style={mutedTextStyle}>Henüz yorum yapılmamış.</Text>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
        
        <View style={[styles.commentInputContainer, containerStyle, borderColor]}>
          <View style={[styles.inputWrapper, inputBgStyle]}>
            <TextInput
              ref={commentInputRef} 
              style={[styles.input, textStyle]}
              placeholder="Yorum ekle..."
              placeholderTextColor={COLORS.mutedDark}
              value={newComment}
              onChangeText={setNewComment}
              multiline={true}
            />
            <Pressable 
              style={styles.sendButton} 
              onPress={handleSendComment}
              disabled={isSubmittingComment}
            >
              {isSubmittingComment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                  <MaterialIcons name="send" size={20} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- StyleSheet ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  fullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  heroImage: {
    width: '100%',
    height: 320,
  },
  imagePlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentPadding: {
    padding: 24,
    gap: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    marginTop: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommender: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
  },
  recommenderName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recommenderUser: {
    fontSize: 14,
  },
  rating: {
    alignItems: 'flex-end',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  favoriteButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  commentsSection: {
    borderTopWidth: 1,
    paddingTop: 24,
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  commentsList: {
    gap: 20,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    flexShrink: 0,
    backgroundColor: '#e0e0e0',
  },
  commentContent: {
    flex: 1,
  },
  commentName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  commentInputContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
    borderWidth: 0,
    borderRadius: 20,
    paddingVertical: 12,
    paddingLeft: 20,
    paddingRight: 60,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});