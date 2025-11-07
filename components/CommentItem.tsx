import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { Comment } from '../types';

// Firebase imports
import { useAuth } from '../contexts/AuthContext';

// Icon
import { MaterialIcons } from '@expo/vector-icons';

// Servisler
import { likeComment, unlikeComment } from '../services/firebase/commentService';

// Bildirim servisi
import { createReplyNotification } from '../services/firebase/notificationService';
import { getUserProfile } from '../services/firebase/userService';

// Yardımcı fonksiyonlar
import { getAvatarUrlWithFallback } from '../utils/avatarUtils';


type CommentItemProps = {
  comment: Comment;
  isDark: boolean;
  recommendationId: string;
  onReply?: (commentId: string, commentText: string) => void;
};

export const CommentItem = ({ comment, isDark, recommendationId, onReply }: CommentItemProps) => {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.uid;
  
  const textStyle = { color: isDark ? COLORS.textDark : COLORS.textLight };
  const mutedTextStyle = { color: isDark ? COLORS.mutedDark : COLORS.mutedLight };
  
  // Beğeni durumu
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  
  // Yorumu beğen
  const handleLike = async () => {
    if (!currentUserId || isLiking) return;
    
    setIsLiking(true);
    
    try {
      if (isLiked) {
        const success = await unlikeComment(recommendationId, comment.id, currentUserId);
        if (success) {
          setIsLiked(false);
          setLikeCount(prev => prev - 1);
        }
      } else {
        const success = await likeComment(recommendationId, comment.id, currentUserId);
        if (success) {
          setIsLiked(true);
          setLikeCount(prev => prev + 1);
          
          // Bildirim gönder
          if (comment.userId !== currentUserId) {
            try {
              const currentUserProfile = await getUserProfile(currentUserId);
              if (currentUserProfile) {
                await createReplyNotification(
                  recommendationId,
                  comment.userId,
                  currentUserId,
                  currentUserProfile.name || currentUserProfile.username || 'Kullanıcı',
                  getAvatarUrlWithFallback(currentUserProfile.photoURL, currentUserProfile.name, currentUserProfile.username),
                  comment.text,
                  'Tavsiye',
                  null
                );
              }
            } catch (notifError) {
              console.error('Bildirim gönderme hatası:', notifError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Yorum beğenme hatası:', error);
    } finally {
      setIsLiking(false);
    }
  };
  
  return (
    <View style={styles.commentItem}>
      <Image source={{ uri: comment.user.avatar }} style={styles.avatarSmall} />
      <View style={styles.commentContent}>
        <Pressable onPress={() => router.push({ pathname: '/profile/[id]', params: { id: comment.userId } })}>
          <Text style={[styles.commentName, textStyle]}>{comment.user.name}</Text>
        </Pressable>
        <Text style={[styles.commentText, mutedTextStyle]}>{comment.text}</Text>
        
        <View style={styles.commentActions}>
          <Pressable 
            style={styles.commentAction}
            onPress={handleLike}
            disabled={isLiking}
          >
            <MaterialIcons 
              name={isLiked ? 'favorite' : 'favorite-border'} 
              size={16} 
              color={isLiked ? COLORS.primary : mutedTextStyle.color} 
            />
            <Text style={[styles.actionText, mutedTextStyle]}>
              {likeCount > 0 ? likeCount : ''}
            </Text>
          </Pressable>
          
          <Pressable 
            style={styles.commentAction}
            onPress={() => onReply && onReply(comment.id, comment.text)}
          >
            <MaterialIcons 
              name="reply" 
              size={16} 
              color={mutedTextStyle.color} 
            />
            <Text style={[styles.actionText, mutedTextStyle]}>Yanıtla</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  commentActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
  },
});

