import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
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
import { CommentItem } from '../../components/CommentItem';
import { StarRating } from '../../components/StarRating';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebaseConfig';
import { addComment, getComments } from '../../services/firebase/commentService';
import { createCommentNotification, createLikeNotification } from '../../services/firebase/notificationService';
import { likeRecommendation, unlikeRecommendation } from '../../services/firebase/recommendationService';
import { getUserProfile } from '../../services/firebase/userService';
import { Comment, Recommendation, User } from '../../types';
import { getAvatarUrlWithFallback } from '../../utils/avatarUtils';


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
  
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isSaving, setIsSaving] = useState(false); 

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
            const recommenderProfile = await getUserProfile(recData.userId);
            if (recommenderProfile) {
                setRecommender({
                  name: recommenderProfile.name,
                  username: recommenderProfile.username,
                  photoURL: recommenderProfile.photoURL,
                  bio: recommenderProfile.bio,
                });
            }
        } else {
           console.warn(`Recommendation ${id} has invalid or missing userId: ${recData.userId}`);
        }

        // 3. Yorumları Çek (servis kullanarak)
        const fetchedComments = await getComments(id);
        setComments(fetchedComments);

        // 6. Beğeni Durumunu Çek
        const likesRef = collection(db, 'recommendations', id, 'likes');
        const likesSnap = await getDocs(likesRef);
        setLikeCount(likesSnap.size);
        
        if(currentUserId) {
            const myLikeRef = doc(db, 'recommendations', id, 'likes', currentUserId);
            const myLikeSnap = await getDoc(myLikeRef);
            setIsLiked(myLikeSnap.exists());
            
            // Kaydetme durumunu çek
            const savedRef = doc(db, 'users', currentUserId, 'savedRecommendations', id);
            const savedSnap = await getDoc(savedRef);
            setIsBookmarked(savedSnap.exists());
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
        const commentId = await addComment(id, authUser.uid, newComment.trim());
        
        if (commentId) {
          const newCommentForState: Comment = {
            id: commentId,
            text: newComment.trim(),
            createdAt: 'şimdi',
            userId: authUser.uid,
            user: {
                name: currentUserProfile.name || `@${currentUserProfile.username}`,
                avatar: getAvatarUrlWithFallback(currentUserProfile.photoURL, currentUserProfile.name, currentUserProfile.username),
            }
          };

          setComments(prevComments => [newCommentForState, ...prevComments]);
          setNewComment('');

          // Bildirim gönder
          if (recommendation && recommendation.userId !== authUser.uid) {
            await createCommentNotification(
              id,
              recommendation.userId,
              authUser.uid,
              currentUserProfile.name || currentUserProfile.username,
              getAvatarUrlWithFallback(currentUserProfile.photoURL, currentUserProfile.name, currentUserProfile.username),
              newComment.trim(),
              recommendation.title,
              recommendation.image
            );
          }
        }

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
      
      try {
          if (isLiked) {
              const success = await unlikeRecommendation(currentUserId, id);
              if (success) {
                  setIsLiked(false);
                  setLikeCount(prev => prev - 1);
              } else {
                  throw new Error("Beğeni kaldırılamadı");
              }
          } else {
              const success = await likeRecommendation(currentUserId, id);
              if (success) {
                  setIsLiked(true);
                  setLikeCount(prev => prev + 1);

                  // Bildirim gönder
                  if (recommendation && recommendation.userId !== currentUserId && currentUserProfile) {
                    await createLikeNotification(
                      id,
                      recommendation.userId,
                      currentUserId,
                      currentUserProfile.name || currentUserProfile.username,
                      getAvatarUrlWithFallback(currentUserProfile.photoURL, currentUserProfile.name, currentUserProfile.username),
                      recommendation.title,
                      recommendation.image
                    );
                  }
              } else {
                  throw new Error("Beğeni eklenemedi");
              }
          }
      } catch (err: any) {
          console.error("Beğeni hatası:", err);
          Alert.alert("Hata", "İşlem yapılırken bir sorun oluştu: " + (err.message || ""));
          // Hata durumunda beğeni durumunu önceki haline döndür
          if (isLiked) {
            setLikeCount(prev => prev + 1);
            setIsLiked(true);
          } else {
            setLikeCount(prev => prev - 1);
            setIsLiked(false);
          }
      } finally {
          setIsLiking(false); 
      }
  };
  
  // Kaydetme Fonksiyonu
  const handleSaveToggle = async () => {
      if (!id || !currentUserId) {
          Alert.alert("Hata", "Tavsiyeyi kaydetmek için giriş yapmalısınız.");
          return;
      }
      
      setIsSaving(true);
      
      const savedRef = doc(db, 'users', currentUserId, 'savedRecommendations', id);
      
      try {
          if (isBookmarked) {
              await deleteDoc(savedRef);
              setIsBookmarked(false);
          } else {
              await setDoc(savedRef, {
                  createdAt: serverTimestamp()
              });
              setIsBookmarked(true);
          }
      } catch (err: any) {
          console.error("Kaydetme hatası:", err);
          Alert.alert("Hata", "İşlem yapılırken bir sorun oluştu.");
      } finally {
          setIsSaving(false);
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
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, mutedTextStyle]}>Yükleniyor...</Text>
      </View>
    );
  }
  if (error || !recommendation) {
    return (
      <View style={[styles.fullScreenCenter, containerStyle]}>
        <StatusBar barStyle="light-content" />
        <Stack.Screen options={{ title: 'Hata' }} />
        <MaterialIcons name="error-outline" size={48} color="red" />
        <Text style={[styles.errorText, { color: 'red' }]}>{error}</Text>
      </View>
    );
  }

  const recommenderName = recommender?.name || 'Kullanıcı';
  const recommenderUsername = recommender?.username ? `@${recommender.username}` : '...';
  const recommenderAvatar = getAvatarUrlWithFallback(recommender?.photoURL, recommender?.name, recommender?.username);

  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]} edges={['bottom']}>
      <StatusBar barStyle="light-content" />
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
          {recommendation.image && (
            <ImageBackground
              source={{ uri: recommendation.image }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          )}

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
            <View style={styles.buttonRow}>
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
              
              {/* --- Kaydet BUTONU --- */}
              <Pressable 
                style={[
                  styles.saveButton, 
                  isBookmarked && { backgroundColor: isDark ? COLORS.mutedDark : COLORS.mutedLight }
                ]}
                onPress={handleSaveToggle}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={isBookmarked ? COLORS.primary : "#FFFFFF"} />
                ) : (
                  <>
                    <MaterialIcons 
                      name={isBookmarked ? 'bookmark' : 'bookmark-border'} 
                      size={24} 
                      color={isBookmarked ? COLORS.primary : "#FFFFFF"} 
                    />
                    <Text style={[styles.saveButtonText, isBookmarked && {color: textStyle.color}]}>
                      {isBookmarked ? 'Kaydedildi' : 'Kaydet'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
            {/* --- GÜNCELLEME SONU --- */}


            {/* Yorumlar */}
            <View style={[styles.commentsSection, borderColor]}>
              <Text style={[styles.commentsTitle, textStyle]}>
                Yorumlar ({comments.length})
              </Text>
              <View style={styles.commentsList}>
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <CommentItem 
                      key={comment.id} 
                      comment={comment} 
                      isDark={isDark} 
                      recommendationId={id!}
                      onReply={(commentId, commentText) => {
                        setNewComment(`@${comment.user.name} ${commentText}`);
                        commentInputRef.current?.focus();
                      }}
                    />
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
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flex: 1,
  },
  saveButtonText: {
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