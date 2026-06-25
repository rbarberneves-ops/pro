import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, Dimensions, FlatList, Modal, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';

const { width } = Dimensions.get('window');

type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  price?: number;
  category?: string;
  condition?: string;
  images?: string[];
  city?: string;
  status: string;
  created_at: string;
  seller?: { full_name: string; avatar_url?: string; user_type?: string; city?: string };
};

const CONDITION_COLORS: Record<string, string> = {
  'Novo': '#34c759',
  'Como novo': '#30d158',
  'Bom estado': '#ff9500',
  'Usado': '#8e8e93',
};

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 1) return 'hoje';
  if (d < 30) return `há ${d} dia${d > 1 ? 's' : ''}`;
  return `há ${Math.floor(d / 30)} mês`;
}

export default function ListingDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [imgIndex, setImgIndex] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setCurrentUserId(session.user.id);

    const { data } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (!data) { setLoading(false); return; }

    const { data: seller } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, user_type, city')
      .eq('id', data.seller_id)
      .single();

    setListing({ ...data, seller });
    setEditTitle(data.title);
    setEditPrice(data.price?.toString() ?? '');
    setEditDesc(data.description ?? '');
    setEditStatus(data.status);
    setLoading(false);
  }

  async function contactSeller() {
    if (!listing?.seller_id) return;
    router.push({ pathname: '/conversation', params: { userId: listing.seller_id, name: listing.seller?.full_name ?? 'Vendedor' } });
  }

  async function saveEdit() {
    if (!listing) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('marketplace_listings')
        .update({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          price: editPrice ? parseFloat(editPrice) : null,
          status: editStatus,
        })
        .eq('id', listing.id);
      if (error) { Alert.alert('Erro', error.message); return; }
      setShowEditModal(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteListing() {
    Alert.alert('Eliminar anúncio', 'Tens a certeza? Esta acção é irreversível.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await supabase.from('marketplace_listings').delete().eq('id', id);
        router.back();
      }},
    ]);
  }

  if (loading) return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ActivityIndicator color={colors.accent} style={{ marginTop: 80 }} />
    </SafeAreaView>
  );

  if (!listing) return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, margin: 16 }]}>
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </TouchableOpacity>
      <Text style={{ color: colors.text, textAlign: 'center', marginTop: 40 }}>Anúncio não encontrado</Text>
    </SafeAreaView>
  );

  const isOwn = currentUserId === listing.seller_id;
  const images = listing.images ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{listing.title}</Text>
        {isOwn ? (
          <TouchableOpacity onPress={() => setShowEditModal(true)} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="pencil-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Galeria */}
        {images.length > 0 ? (
          <View>
            <FlatList
              data={images}
              keyExtractor={(_, i) => String(i)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={e => setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={[styles.mainImg, { width }]} />
              )}
            />
            {images.length > 1 && (
              <View style={styles.dotsRow}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: i === imgIndex ? '#fff' : 'rgba(255,255,255,0.5)' }]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.noImg, { backgroundColor: colors.card2 }]}>
            <Ionicons name="image-outline" size={56} color={colors.textMuted} />
          </View>
        )}

        {/* Info principal */}
        <View style={styles.body}>
          {/* Status badges */}
          <View style={styles.badgesRow}>
            {listing.condition && (
              <View style={[styles.badge, { backgroundColor: (CONDITION_COLORS[listing.condition] ?? '#8e8e93') + '22' }]}>
                <Text style={[styles.badgeText, { color: CONDITION_COLORS[listing.condition] ?? '#8e8e93' }]}>{listing.condition}</Text>
              </View>
            )}
            {listing.category && (
              <View style={[styles.badge, { backgroundColor: colors.card2 }]}>
                <Text style={[styles.badgeText, { color: colors.textSub }]}>{listing.category}</Text>
              </View>
            )}
            {listing.status === 'sold' && (
              <View style={[styles.badge, { backgroundColor: '#e9456022' }]}>
                <Text style={[styles.badgeText, { color: '#e94560' }]}>Vendido</Text>
              </View>
            )}
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{listing.title}</Text>

          <Text style={[styles.price, { color: colors.accent }]}>
            {listing.price != null ? `€${listing.price.toFixed(2)}` : 'Preço a negociar'}
          </Text>

          <View style={styles.metaRow}>
            {listing.city && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>{listing.city}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{timeAgo(listing.created_at)}</Text>
            </View>
          </View>

          {listing.description && (
            <View style={[styles.descBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.descLabel, { color: colors.textMuted }]}>DESCRIÇÃO</Text>
              <Text style={[styles.desc, { color: colors.textSub }]}>{listing.description}</Text>
            </View>
          )}

          {/* Vendedor */}
          {listing.seller && (
            <TouchableOpacity
              style={[styles.sellerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/profile-detail', params: { id: listing!.seller_id } })}>
              {listing.seller.avatar_url ? (
                <Image source={{ uri: listing.seller.avatar_url }} style={styles.sellerAvatar} />
              ) : (
                <View style={[styles.sellerAvatarFallback, { backgroundColor: colors.accent }]}>
                  <Text style={styles.sellerAvatarText}>{listing.seller.full_name?.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.sellerInfo}>
                <Text style={[styles.sellerName, { color: colors.text }]}>{listing.seller.full_name}</Text>
                <Text style={[styles.sellerSub, { color: colors.textSub }]}>
                  {listing.seller.user_type === 'professional' ? 'Profissional' : 'Espaço'}
                  {listing.seller.city ? ` · ${listing.seller.city}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {isOwn && (
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: '#e94560' }]}
              onPress={deleteListing}>
              <Ionicons name="trash-outline" size={16} color="#e94560" />
              <Text style={styles.deleteBtnText}>Eliminar anúncio</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* CTA Contactar */}
      {!isOwn && listing.status === 'active' && (
        <View style={[styles.ctaBar, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: colors.accent }]} onPress={contactSeller}>
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            <Text style={styles.ctaBtnText}>Contactar vendedor</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal editar */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditModal(false)}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowEditModal(false)} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Editar anúncio</Text>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.accent }]}
              onPress={saveEdit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.editLabel, { color: colors.textMuted }]}>TÍTULO</Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={editTitle} onChangeText={setEditTitle}
            />
            <Text style={[styles.editLabel, { color: colors.textMuted }]}>PREÇO (€)</Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={editPrice} onChangeText={setEditPrice} keyboardType="numeric"
              placeholder="Deixa vazio para 'a negociar'" placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.editLabel, { color: colors.textMuted }]}>DESCRIÇÃO</Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, minHeight: 80, textAlignVertical: 'top' }]}
              value={editDesc} onChangeText={setEditDesc} multiline
            />
            <Text style={[styles.editLabel, { color: colors.textMuted }]}>ESTADO DO ANÚNCIO</Text>
            {(['active', 'paused', 'sold'] as const).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.statusOption, { backgroundColor: colors.card, borderColor: colors.border },
                  editStatus === s && { borderColor: colors.accent, backgroundColor: colors.accentBg }]}
                onPress={() => setEditStatus(s)}>
                <Ionicons
                  name={s === 'active' ? 'checkmark-circle-outline' : s === 'paused' ? 'pause-circle-outline' : 'close-circle-outline'}
                  size={20}
                  color={editStatus === s ? colors.accent : colors.textMuted}
                />
                <Text style={[styles.statusText, { color: editStatus === s ? colors.accent : colors.textSub }]}>
                  {s === 'active' ? 'Activo — visível no Mercado' : s === 'paused' ? 'Pausado — não visível' : 'Vendido — marcar como vendido'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
  mainImg: { height: 300, resizeMode: 'cover' },
  noImg: { height: 220, alignItems: 'center', justifyContent: 'center' },
  dotsRow: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  body: { padding: 20, gap: 14 },
  badgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  price: { fontSize: 28, fontWeight: '900' },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13 },
  descBox: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 8 },
  descLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  desc: { fontSize: 15, lineHeight: 22 },
  sellerCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 14, borderWidth: 1 },
  sellerAvatar: { width: 48, height: 48, borderRadius: 24 },
  sellerAvatarFallback: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sellerAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  sellerInfo: { flex: 1 },
  sellerName: { fontSize: 15, fontWeight: '700' },
  sellerSub: { fontSize: 13, marginTop: 2 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12, borderWidth: 1 },
  deleteBtnText: { color: '#e94560', fontSize: 14, fontWeight: '600' },
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, borderTopWidth: 1 },
  ctaBtn: { borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  editLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  editInput: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1 },
  statusOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, borderWidth: 1 },
  statusText: { fontSize: 14, fontWeight: '600' },
});
