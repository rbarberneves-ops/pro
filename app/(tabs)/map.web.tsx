// Mapa web completo com Leaflet + markers do Supabase
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';

declare const window: any;
declare const document: any;

type SpaceMarker = {
  id: string;
  full_name?: string;
  city?: string;
  bio?: string;
  latitude: number;
  longitude: number;
};

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject('no window'); return; }
    if (window.L) { resolve(window.L); return; }

    if (!document.querySelector('#leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function MapWebScreen() {
  const { colors } = useTheme();
  const mapContainerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const [spaces, setSpaces] = useState<SpaceMarker[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    fetchSpaces();
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []));

  async function fetchSpaces() {
    setLoading(true);
    const { data } = await supabase
      .from('spaces')
      .select('id, latitude, longitude, city, bio')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (!data || data.length === 0) { setSpaces([]); setLoading(false); return; }

    const ids = data.map((s: any) => s.id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, city, bio')
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

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    async function initMap() {
      try {
        const L = await loadLeaflet();
        if (cancelled || !mapContainerRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
          center: [39.5, -8.0],
          zoom: 7,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        spaces.forEach((space) => {
          const icon = L.divIcon({
            html: `<div style="background:#e94560;width:36px;height:36px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);font-size:16px;cursor:pointer;">✂️</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            className: '',
          });

          const marker = L.marker([space.latitude, space.longitude], { icon });
          marker.bindPopup(`
            <div style="font-family:system-ui,sans-serif;min-width:180px;padding:4px 0;">
              <b style="font-size:14px;color:#111;">${space.full_name || 'Espaço'}</b><br/>
              ${space.city ? `<span style="color:#888;font-size:12px;">📍 ${space.city}</span><br/>` : ''}
              ${space.bio ? `<p style="font-size:12px;color:#555;margin:6px 0;">${space.bio.substring(0, 100)}${space.bio.length > 100 ? '...' : ''}</p>` : ''}
              <a href="javascript:void(0)" onclick="window.__proNavProfile('${space.id}')" style="color:#e94560;font-size:13px;font-weight:700;text-decoration:none;">Ver perfil →</a>
            </div>
          `);
          marker.addTo(map);
        });

        mapInstanceRef.current = map;

        (window as any).__proNavProfile = (id: string) => {
          router.push({ pathname: '/profile-detail', params: { id } });
        };
      } catch (e) {
        console.warn('Leaflet init error:', e);
      }
    }

    const t = setTimeout(initMap, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [loading, spaces]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Mapa</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.count, { color: colors.textMuted }]}>
            {spaces.length} espaço{spaces.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={fetchSpaces} style={[styles.locBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="refresh-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSub }]}>A carregar espaços...</Text>
        </View>
      ) : (
        <View ref={mapContainerRef} style={styles.map} />
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
  map: { flex: 1 } as any,
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
});
