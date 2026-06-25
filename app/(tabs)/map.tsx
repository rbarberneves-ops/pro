import { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ActivityIndicator, Image, Dimensions
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';

const { width } = Dimensions.get('window');

type SpaceMarker = {
  id: string;
  full_name: string;
  avatar_url?: string;
  city?: string;
  bio?: string;
  latitude: number;
  longitude: number;
};

const PORTUGAL_CENTER = { latitude: 39.5, longitude: -8.0, latitudeDelta: 4.5, longitudeDelta: 4.5 };

export default function MapScreen() {
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [spaces, setSpaces] = useState<SpaceMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  useFocusEffect(useCallback(() => {
    fetchSpaces();
  }, []));

  async function fetchSpaces() {
    setLoading(true);
    const { data } = await supabase
      .from('spaces')
      .select('id, latitude, longitude, city, bio, space_name')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (!data || data.length === 0) { setSpaces([]); setLoading(false); return; }

    const ids = data.map((s: any) => s.id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, city, bio')
      .in('id', ids);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    setSpaces(data.map((s: any) => ({
      id: s.id,
      latitude: s.latitude,
      longitude: s.longitude,
      ...profileMap.get(s.id),
    })));
    setLoading(false);
  }

  async function goToMyLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 800);
    } finally {
      setLocating(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Mapa</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.count, { color: colors.textMuted }]}>
            {spaces.length} espaço{spaces.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            onPress={goToMyLocation}
            style={[styles.locBtn, { backgroundColor: colors.card }]}
            disabled={locating}>
            {locating
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <Ionicons name="locate-outline" size={20} color={colors.accent} />}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSub }]}>A carregar espaços...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={PORTUGAL_CENTER}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
            showsUserLocation
            showsCompass={false}>
            {spaces.map(space => (
              <Marker
                key={space.id}
                coordinate={{ latitude: space.latitude, longitude: space.longitude }}
                pinColor={colors.accent}>
                <View style={[styles.markerPin, { backgroundColor: colors.accent }]}>
                  {space.avatar_url ? (
                    <Image source={{ uri: space.avatar_url }} style={styles.markerAvatar} />
                  ) : (
                    <Text style={styles.markerInitial}>{space.full_name?.charAt(0).toUpperCase() ?? '?'}</Text>
                  )}
                </View>
                <Callout
                  tooltip
                  onPress={() => router.push({ pathname: '/profile-detail', params: { id: space.id } })}>
                  <View style={[styles.callout, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.calloutName, { color: colors.text }]} numberOfLines={1}>{space.full_name}</Text>
                    {space.city && (
                      <Text style={[styles.calloutCity, { color: colors.textSub }]}>📍 {space.city}</Text>
                    )}
                    {space.bio && (
                      <Text style={[styles.calloutBio, { color: colors.textMuted }]} numberOfLines={2}>{space.bio}</Text>
                    )}
                    <Text style={[styles.calloutCta, { color: colors.accent }]}>Ver perfil →</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>

          {spaces.length === 0 && (
            <View style={styles.emptyOverlay}>
              <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <Ionicons name="map-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSub }]}>
                  Ainda não há espaços com localização definida.
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  count: { fontSize: 13 },
  locBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  markerPin: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  markerAvatar: { width: 38, height: 38, borderRadius: 19 },
  markerInitial: { color: '#fff', fontSize: 18, fontWeight: '700' },
  callout: { width: width * 0.65, borderRadius: 14, padding: 14, borderWidth: 1, gap: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  calloutName: { fontSize: 15, fontWeight: '700' },
  calloutCity: { fontSize: 12 },
  calloutBio: { fontSize: 12, marginTop: 2 },
  calloutCta: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  emptyOverlay: { position: 'absolute', bottom: 40, left: 20, right: 20, alignItems: 'center' },
  emptyCard: { borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, width: '100%' },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
