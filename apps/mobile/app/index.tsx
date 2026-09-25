import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@travelpoint/theme';

export default function RootIndex() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.void }}>
      <ActivityIndicator color={Colors.aurora} size="large" />
    </View>
  );
}
