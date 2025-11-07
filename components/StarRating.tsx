import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';

type StarRatingProps = {
  rating: number;
  isDark: boolean;
};

export const StarRating = ({ rating, isDark }: StarRatingProps) => {
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

const styles = StyleSheet.create({
  rating: {
    alignItems: 'flex-end',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

