import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, LetterSpacing } from '@travelpoint/theme';
import { formatCoordPair } from '@travelpoint/utils';

interface CoordLabelProps {
  lat: number;
  lng: number;
  locked?: boolean;
}

export function CoordLabel({ lat, lng, locked = false }: CoordLabelProps) {
  return (
    <View style={styles.container}>
      {locked ? (
        <Text style={styles.locked}>🔒 ··.····°N ··.····°E</Text>
      ) : (
        <Text style={styles.coord}>{formatCoordPair(lat, lng)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coord: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.coord,
    color: Colors.aurora,
    letterSpacing: parseFloat(LetterSpacing.coord),
  },
  locked: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.coord,
    color: Colors.starGhost,
    letterSpacing: parseFloat(LetterSpacing.coord),
  },
});
