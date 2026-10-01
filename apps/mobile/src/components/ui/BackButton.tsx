import { Pressable, Text, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';

interface BackButtonProps {
  label?: string;
  onPress?: () => void;
}

export function BackButton({ label = 'Wróć', onPress }: BackButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      onPress={onPress ?? (() => router.back())}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 12 }}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="chevron-back" size={18} color={Colors.starlight} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.graphite,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: BorderRadius.full,
    paddingVertical: 7,
    paddingLeft: 8,
    paddingRight: 14,
  },
  btnPressed: {
    backgroundColor: Colors.graphiteSoft,
    borderColor: Colors.aurora,
  },
  iconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: FontSize.bodySm,
    color: Colors.starlight,
    letterSpacing: 0.1,
  },
});
