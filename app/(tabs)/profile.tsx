import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ActivityIndicator, Image, ScrollView, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Session } from '@supabase/supabase-js';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 3) / 3;

type Profile = {
  full_name: string;
  username?: string;
  user_type: 'professional' | 'space' | 'store';
  bio?: string;
  city?: string;
  phone?: string;
  avatar_url?: string;
  specialties?: string[];
  portfolio_urls?: string[];
  verified?: boolean;
  premium?: boolean;
  premium_until?: string;
};

export default function ProfileScreen() {
  const { colors } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [extra, setExtra] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    if (!session) { setLoading(false); return; }

    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    setProfile(data);

    if (data?.user_type === 'professional') {
      const { data: prof } = await supabase.from('professionals').select('*').eq('id', session.user.id).single();
      setExtra(prof);
    } else if (data?.user_type === 'space') {
      const { data: space } = await supabase.from('spaces').select('*').eq('id', session.user.id).single();
      setExtra(space);
    } else if (data?.user_type === 'store') {
      const { data: store } = await supabase.from('stores').select('*').eq('id', session.user.id).single();
      setExtra(store);
    }

    setLoading(false);
  }

  if (loading) return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
    </SafeAreaView>
  );

  const photos = profile?.portfolio_urls ?? [];
  const isPro = profile?.user_type === 'professional';
  const isStore = profile?.user_type === 'store';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.username, { color: colors.text }]}>
          {profile?.username ? `@${profile.username}` : session?.user?.email?.split('@')[0]}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/edit-profile')} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="pencil-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + stats */}
        <View style={styles.profileRow}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{profile?.full_name?.charAt(0).toUpperCase() ?? '?'}</Text>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.text }]}>{photos.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSub }]}>fotos</Text>
            </View>
            {isPro ? (
              <>
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{extra?.experience_years ?? '—'}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSub }]}>anos exp.</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{profile?.specialties?.length ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSub }]}>skills</Text>
                </View>
              </>
            ) : isStore ? (
              <>
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.text, fontSize: 12 }]} numberOfLines={1}>{extra?.store_type ?? '—'}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSub }]}>tipo</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.text, fontSize: 13 }]} numberOfLines={1}>{profile?.city ?? '—'}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSub }]}>cidade</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{extra?.capacity ?? '—'}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSub }]}>vagas</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.text, fontSize: 13 }]} numberOfLines={1}>{profile?.city ?? '—'}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSub }]}>cidade</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Nome + badge + bio */}
        <View style={styles.bioSection}>
          <View style={styles.nameRow}>
            {profile?.premium && <Ionicons name="star" size={16} color="#f0a500" />}
            <Text style={[styles.name, { color: colors.text }]}>{profile?.full_name ?? 'Sem nome'}</Text>
            {profile?.verified && <Ionicons name="checkmark-circle" size={18} color="#007aff" />}
            <View style={[styles.badge, { backgroundColor: colors.card }]}>
              <Text style={[styles.badgeText, { color: colors.textSub }]}>{isPro ? 'Profissional' : isStore ? 'Loja' : 'Espaço'}</Text>
            </View>
            {profile?.premium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            )}
          </View>

          {profile?.city && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color={colors.textSub} />
              <Text style={[styles.infoText, { color: colors.textSub }]}>{profile.city}</Text>
            </View>
          )}

          {profile?.bio ? (
            <Text style={[styles.bio, { color: colors.textSub }]}>{profile.bio}</Text>
          ) : (
            <TouchableOpacity onPress={() => router.push('/edit-profile')}>
              <Text style={[styles.bioEmpty, { color: colors.accent }]}>+ Adiciona uma bio</Text>
            </TouchableOpacity>
          )}

          {isPro && profile?.specialties && profile.specialties.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={styles.chipsRow}>
                {profile.specialties.map(s => (
                  <View key={s} style={[styles.chip, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
                    <Text style={[styles.chipText, { color: colors.accent }]}>{s}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
          {isStore && (
            <View style={{ marginTop: 10, gap: 6 }}>
              {extra?.store_type && (
                <View style={styles.infoRow}>
                  <Ionicons name="storefront-outline" size={14} color={colors.textSub} />
                  <Text style={[styles.infoText, { color: colors.textSub }]}>{extra.store_type}</Text>
                </View>
              )}
              {extra?.website ? (
                <View style={styles.infoRow}>
                  <Ionicons name="globe-outline" size={14} color={colors.accent} />
                  <Text style={[styles.infoText, { color: colors.accent }]}>{extra.website}</Text>
                </View>
              ) : null}
              {extra?.instagram ? (
                <View style={styles.infoRow}>
                  <Ionicons name="logo-instagram" size={14} color={colors.accent} />
                  <Text style={[styles.infoText, { color: colors.accent }]}>@{extra.instagram}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Botões de ação */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, gap: 10 }}>
          <TouchableOpacity
            style={[styles.editBtn, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/edit-profile')}>
            <Text style={[styles.editBtnText, { color: colors.text }]}>Editar perfil</Text>
          </TouchableOpacity>
          {isStore && (
            <TouchableOpacity
              style={[styles.editBtn, { flex: 1, backgroundColor: colors.accentBg, borderColor: colors.accent }]}
              onPress={() => router.push('/create-ad')}>
              <Ionicons name="megaphone-outline" size={15} color={colors.accent} />
              <Text style={[styles.editBtnText, { color: colors.accent }]}>Anunciar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Grid de fotos */}
        {photos.length === 0 ? (
          <TouchableOpacity style={styles.emptyPhotos} onPress={() => router.push('/edit-profile')}>
            <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyPhotosText, { color: colors.textMuted }]}>Adiciona as tuas fotos</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.grid}>
            {photos.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.gridPhoto} />
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  username: { fontSize: 18, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 20 },
  avatar: { width: 86, height: 86, borderRadius: 43, borderWidth: 2, borderColor: '#e94560' },
  avatarFallback: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#e94560', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: '700' },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12 },
  bioSection: { paddingHorizontal: 16, paddingBottom: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' },
  name: { fontSize: 17, fontWeight: '700' },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  infoText: { fontSize: 13 },
  bio: { fontSize: 14, lineHeight: 20 },
  bioEmpty: { fontSize: 14 },
  chipsRow: { flexDirection: 'row', gap: 6 },
  chip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  premiumBadge: { backgroundColor: '#f0a500', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  premiumBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  editBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  editBtnText: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginBottom: 2 },
  emptyPhotos: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
  emptyPhotosText: { fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1.5 },
  gridPhoto: { width: PHOTO_SIZE, height: PHOTO_SIZE },
});
