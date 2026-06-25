import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';

export default function MapWebFallback() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Ionicons name="map-outline" size={64} color={colors.accent} />
      <Text style={[styles.title, { color: colors.text }]}>Mapa disponível na app</Text>
      <Text style={[styles.sub, { color: colors.textSub }]}>
        O mapa interativo está disponível na versão móvel da app PRO.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
