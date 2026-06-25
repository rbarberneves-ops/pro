import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  TextInput, Image, ActivityIndicator, ScrollView, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { depthShadow } from '@/lib/animated';
import { useTranslation } from 'react-i18next';

// Keys are DB values (Portuguese), labels are translated
const CATEGORY_KEYS = ['Todos', 'Máquinas', 'Cadeiras/Mobiliário', 'Equipamento', 'Produtos', 'Outros'];
const CONDITION_KEYS = ['Qualquer', 'Novo', 'Como novo', 'Bom estado', 'Usado'];

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
  seller?: { full_name: string; avatar_url?: string };
};

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 1) return 'hoje';
  if (d < 30) return `há ${d}d`;
  return `há ${Math.floor(d / 30)}m`;
}

export default function MarketplaceScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const CATEGORIES = [
    { key: 'Todos', label: t('marketplace.catAll') },
    { key: 'Máquinas', label: t('marketplace.catMachines') },
    { key: 'Cadeiras/Mobiliário', label: t('marketplace.catChairs') },
    { key: 'Equipamento', label: t('marketplace.catEquipment') },
    { key: 'Produtos', label: t('marketplace.catProducts') },
    { key: 'Outros', label: t('marketplace.catOther') },
  ];
  const CONDITIONS = [
    { key: 'Qualquer', label: t('marketplace.condAny') },
    { key: 'Novo', label: t('marketplace.condNew') },
    { key: 'Como novo', label: t('marketplace.condLikeNew') },
    { key: 'Bom estado', label: t('marketplace.condGood') },
    { key: 'Usado', label: t('marketplace.condUsed') },
  ];

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [draftCondition, setDraftCondition] = useState('Qualquer');
  const [draftMaxPrice, setDraftMaxPrice] = useState('');
  const [activeCondition, setActiveCondition] = useState('Qualquer');
  const [activeMaxPrice, setActiveMaxPrice] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  async function load() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setCurrentUserId(session.user.id);

    const { data } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data || data.length === 0) { setListings([]); setLoading(false); return; }

    const sellerIds = [...new Set(data.map((l: any) => l.seller_id))];
    const { data: sellers } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', sellerIds);

    const sellerMap = new Map((sellers ?? []).map((s: any) => [s.id, s]));
    setListings(data.map((l: any) => ({ ...l, seller: sellerMap.get(l.seller_id) })));
    setLoading(false);
  }

  function applyFilters() {
    setActiveCondition(draftCondition);
    setActiveMaxPrice(draftMaxPrice);
    setShowFilterModal(false);
  }

  const hasActiveFilters = activeCondition !== 'Qualquer' || activeMaxPrice !== '';

  const filtered = listings.filter(l => {
    if (selectedCategory !== 'Todos' && l.category !== selectedCategory) return false;
    if (activeCondition !== 'Qualquer' && l.condition !== activeCondition) return false;
    if (activeMaxPrice && l.price != null && l.price > parseFloat(activeMaxPrice)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!l.title?.toLowerCase().includes(q) && !l.description?.toLowerCase().includes(q) && !l.city?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Marketplace</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/new-listing')}><LinearGradient colors={colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Barra de pesquisa */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, flex: 1 }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('marketplace.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, !hasActiveFilters && { backgroundColor: colors.card }]}
          onPress={() => { setDraftCondition(activeCondition); setDraftMaxPrice(activeMaxPrice); setShowFilterModal(true); }}>
          {hasActiveFilters && <LinearGradient colors={colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />}
          <Ionicons name="options-outline" size={20} color={hasActiveFilters ? '#fff' : colors.text} />
        </TouchableOpacity>
      </View>

      {/* Categorias */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catsRow}>
        {CATEGORIES.map(cat => {
          const active = selectedCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catChip, { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? 'transparent' : colors.card }]}
              onPress={() => setSelectedCategory(cat.key)}>
              {active && <LinearGradient colors={colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill} />}
              <Text style={[styles.catText, { color: active ? '#fff' : colors.textSub }]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="storefront-outline" size={56} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('marketplace.noListings')}</Text>
          <Text style={[styles.emptyText, { color: colors.textSub }]}>{t('marketplace.emptyBeFirst')}</Text>
          <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.accent }]} onPress={() => router.push('/new-listing')}>
            <Text style={styles.emptyBtnText}>{t('marketplace.createListing')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.count, { color: colors.textMuted }]}>{filtered.length} {filtered.length !== 1 ? t('marketplace.listings') : t('marketplace.listing')}</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/listing-detail', params: { id: item.id } })}
              activeOpacity={0.8}>
              {item.images && item.images.length > 0 ? (
                <Image source={{ uri: item.images[0] }} style={styles.cardImg} />
              ) : (
                <View style={[styles.cardImgFallback, { backgroundColor: colors.card2 }]}>
                  <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.cardBody}>
                {item.condition && (
                  <View style={[styles.conditionBadge, { backgroundColor: colors.card2 }]}>
                    <Text style={[styles.conditionText, { color: colors.textSub }]}>{item.condition}</Text>
                  </View>
                )}
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.cardPrice, { color: colors.accent }]}>
                  {item.price != null ? `€${item.price.toFixed(2)}` : t('marketplace.priceNegotiable')}
                </Text>
                <View style={styles.cardMeta}>
                  {item.city && <Text style={[styles.cardCity, { color: colors.textMuted }]} numberOfLines={1}>📍 {item.city}</Text>}
                  <Text style={[styles.cardTime, { color: colors.textMuted }]}>{timeAgo(item.created_at)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal filtros */}
      <Modal visible={showFilterModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilterModal(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSub }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('marketplace.filterTitle')}</Text>
            <TouchableOpacity onPress={() => { setDraftCondition('Qualquer'); setDraftMaxPrice(''); }}>
              <Text style={[styles.modalClear, { color: colors.accent }]}>{t('marketplace.filterClear')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
            <Text style={[styles.filterLabel, { color: colors.textMuted }]}>{t('marketplace.filterCondition')}</Text>
            <View style={styles.conditionsGrid}>
              {CONDITIONS.map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.conditionOption,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    draftCondition === c.key && { backgroundColor: colors.accentBg, borderColor: colors.accent }]}
                  onPress={() => setDraftCondition(c.key)}>
                  <Text style={[styles.conditionOptionText, { color: draftCondition === c.key ? colors.accent : colors.textSub }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.filterLabel, { color: colors.textMuted }]}>{t('marketplace.filterMaxPrice')}</Text>
            <View style={[styles.priceInput, { backgroundColor: colors.card, borderColor: draftMaxPrice ? colors.accent : colors.border }]}>
              <Text style={[styles.priceSymbol, { color: colors.textMuted }]}>€</Text>
              <TextInput
                style={[styles.priceInputText, { color: colors.text }]}
                placeholder={t('marketplace.filterNoLimit')}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={draftMaxPrice}
                onChangeText={setDraftMaxPrice}
              />
            </View>
          </ScrollView>
          <View style={[styles.applyRow, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <LinearGradient colors={colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill} />
              <Text style={styles.applyBtnText}>{t('marketplace.applyFilters')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '800' },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...depthShadow },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 12, marginBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 15 },
  filterBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  catsRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
  catChip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, overflow: 'hidden' },
  catText: { fontSize: 11, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  emptyBtn: { borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  count: { fontSize: 12, marginBottom: 10 },
  grid: { padding: 16, gap: 12 },
  card: { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  cardImg: { width: '100%', aspectRatio: 1, resizeMode: 'cover' },
  cardImgFallback: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 10, gap: 4 },
  conditionBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  conditionText: { fontSize: 10, fontWeight: '600' },
  cardTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  cardPrice: { fontSize: 15, fontWeight: '800' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  cardCity: { fontSize: 11, flex: 1 },
  cardTime: { fontSize: 11 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalClear: { fontSize: 15 },
  filterLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  conditionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  conditionOption: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  conditionOptionText: { fontSize: 13, fontWeight: '600' },
  priceInput: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5 },
  priceSymbol: { fontSize: 16, fontWeight: '600' },
  priceInputText: { flex: 1, fontSize: 16 },
  applyRow: { padding: 16, paddingBottom: 32, borderTopWidth: 1 },
  applyBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', overflow: 'hidden', ...depthShadow },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
