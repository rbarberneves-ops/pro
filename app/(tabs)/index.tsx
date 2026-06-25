import { useCallback, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, ActivityIndicator, Image, Alert,
  Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { depthShadow } from '@/lib/animated';
import { useTranslation } from 'react-i18next';

const CIDADES_PORTUGAL = [
  'Açores','Agueda','Albufeira','Alcácer do Sal','Alcochete','Alenquer','Almada',
  'Almeirim','Alpiarça','Alter do Chão','Alvito','Amadora','Amarante','Amares',
  'Anadia','Ansião','Arcos de Valdevez','Arganil','Armamar','Arouca','Arraiolos',
  'Arronches','Arruda dos Vinhos','Aveiro','Avis','Azambuja','Baião','Barcelos',
  'Barrancos','Barreiro','Batalha','Beja','Belmonte','Benavente','Bombarral',
  'Borba','Boticas','Braga','Bragança','Cabeceiras de Basto','Cadaval','Caldas da Rainha',
  'Caminha','Cantanhede','Carrazeda de Ansiães','Carregal do Sal','Castanheira de Pêra',
  'Castelo Branco','Castelo de Paiva','Castelo de Vide','Castro Daire','Castro Marim',
  'Castro Verde','Celorico da Beira','Celorico de Basto','Chamusca','Chaves',
  'Cinfães','Coimbra','Condeixa-a-Nova','Constância','Coruche','Covilhã','Crato',
  'Cuba','Elvas','Entroncamento','Espinho','Esposende','Estremoz','Évora',
  'Fafe','Faro','Felgueiras','Ferreira do Alentejo','Ferreira do Zêzere','Figueira da Foz',
  'Figueira de Castelo Rodrigo','Figueiró dos Vinhos','Fronteira','Fundão','Gavião',
  'Góis','Golegã','Gondomar','Grândola','Guarda','Guimarães','Idanha-a-Nova',
  'Ílhavo','Lagoa','Lagos','Lamego','Leiria','Lisboa','Loulé','Loures','Lousã',
  'Lousada','Mação','Macedo de Cavaleiros','Madeira','Mafra','Maia','Mangualde',
  'Manteigas','Marco de Canaveses','Marinha Grande','Marvão','Matosinhos',
  'Mealhada','Meda','Melgaço','Mesão Frio','Miranda do Corvo','Miranda do Douro',
  'Mirandela','Mogadouro','Moimenta da Beira','Moita','Monção','Monchique',
  'Mondim de Basto','Monforte','Montalegre','Montemor-o-Novo','Montemor-o-Velho',
  'Montijo','Mora','Mortágua','Moura','Mourão','Murça','Murtosa','Nazaré',
  'Nelas','Nisa','Óbidos','Odemira','Odivelas','Oeiras','Oleiros','Olhão',
  'Oliveira de Azeméis','Oliveira de Frades','Oliveira do Bairro','Oliveira do Hospital',
  'Ourém','Ourique','Ovar','Paços de Ferreira','Palmela','Pampilhosa da Serra',
  'Paredes','Paredes de Coura','Pedrogão Grande','Penacova','Penafiel','Penalva do Castelo',
  'Penamacor','Penedono','Penela','Peniche','Peso da Régua','Pinhel','Pombal',
  'Ponte da Barca','Ponte de Lima','Ponte de Sor','Portalegre','Portel','Portimão',
  'Porto','Póvoa de Lanhoso','Póvoa de Varzim','Proença-a-Nova','Redondo','Reguengos de Monsaraz',
  'Resende','Ribeira de Pena','Rio Maior','Sabrosa','Sabugal','Salvaterra de Magos',
  'Santa Comba Dão','Santa Maria da Feira','Santarém','Santiago do Cacém','Santo Tirso',
  'São Brás de Alportel','São João da Madeira','São João da Pesqueira','São Pedro do Sul',
  'Sardoal','Sátão','Seia','Seixal','Serpa','Sertã','Sesimbra','Setúbal','Sever do Vouga',
  'Silves','Sines','Sintra','Sobral de Monte Agraço','Soure','Sousel','Tábua',
  'Tabuaço','Tarouca','Tavira','Terras de Bouro','Tomar','Tondela','Torre de Moncorvo',
  'Torres Novas','Torres Vedras','Trancoso','Trofa','Vagos','Vale de Cambra',
  'Valença','Valongo','Valpaços','Vendas Novas','Viana do Alentejo','Viana do Castelo',
  'Vidigueira','Vieira do Minho','Vila de Rei','Vila do Bispo','Vila do Conde',
  'Vila Flor','Vila Franca de Xira','Vila Nova da Barquinha','Vila Nova de Cerveira',
  'Vila Nova de Famalicão','Vila Nova de Foz Côa','Vila Nova de Gaia','Vila Nova de Paiva',
  'Vila Nova de Poiares','Vila Pouca de Aguiar','Vila Real','Vila Real de Santo António',
  'Vila Velha de Ródão','Vila Verde','Vila Viçosa','Vimioso','Vinhais','Viseu','Vizela',
];

type Profile = {
  id: string;
  full_name: string;
  user_type: 'professional' | 'space';
  avatar_url?: string;
  bio?: string;
  city?: string;
  specialties?: string[];
  verified?: boolean;
  premium?: boolean;
};

type Filters = {
  type: 'all' | 'professional' | 'space';
  city: string;
  specialty: string;
};

const DEFAULT_FILTERS: Filters = { type: 'all', city: '', specialty: '' };

const SPECIALTIES = [
  'Cabeleireiro', 'Barbeiro', 'Manicure', 'Pedicure', 'Estética',
  'Maquilhagem', 'Massagens', 'Sobrancelhas', 'Extensões', 'Tatuagem',
  'Piercing', 'Bronzeamento', 'Depilação', 'Nutrição', 'Personal Trainer',
];

export default function DescubrirScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likingId, setLikingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');

  const hasActiveFilters = filters.type !== 'all' || filters.city !== '' || filters.specialty !== '';

  useFocusEffect(useCallback(() => {
    load();
  }, [filters]));

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setCurrentUserId(session.user.id);
    await fetchProfiles(session.user.id);
  }

  async function fetchProfiles(uid: string) {
    setLoading(true);
    let query = supabase.from('profiles').select('*').neq('user_type', null).neq('user_type', 'store').neq('id', uid);
    if (filters.type !== 'all') query = query.eq('user_type', filters.type);
    if (filters.city.trim()) query = query.ilike('city', `%${filters.city.trim()}%`);
    if (filters.specialty) query = query.contains('specialties', [filters.specialty]);
    const { data } = await query.limit(100);
    setProfiles(data ?? []);
    const { data: likes } = await supabase.from('likes').select('to_user').eq('from_user', uid);
    setLikedIds(new Set((likes ?? []).map((l: any) => l.to_user)));
    setLoading(false);
  }

  async function toggleLike(profile: Profile) {
    if (likingId) return;
    setLikingId(profile.id);
    try {
      const isLiked = likedIds.has(profile.id);
      if (isLiked) {
        await supabase.from('likes').delete().eq('from_user', currentUserId).eq('to_user', profile.id);
        setLikedIds(prev => { const s = new Set(prev); s.delete(profile.id); return s; });
      } else {
        await supabase.from('likes').insert({ from_user: currentUserId, to_user: profile.id });
        setLikedIds(prev => new Set(prev).add(profile.id));
        const { data: mutual } = await supabase.from('likes')
          .select('id').eq('from_user', profile.id).eq('to_user', currentUserId).maybeSingle();
        if (mutual) {
          Alert.alert('🎉 ' + t('matches.newInteraction'), t('matches.mutualInterest', { name: profile.full_name }), [
            { text: t('matches.title'), onPress: () => router.push('/(tabs)/matches') },
            { text: t('common.cancel'), style: 'cancel' },
          ]);
        }
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLikingId(null);
    }
  }

  function openFilters() {
    setDraftFilters(filters);
    setShowFilterModal(true);
  }

  function applyFilters() {
    setFilters(draftFilters);
    setShowFilterModal(false);
  }

  function clearFilters() {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setShowFilterModal(false);
  }

  function onSearchChange(text: string) {
    setSearch(text);
    if (text.length >= 2) {
      const matches = CIDADES_PORTUGAL.filter(c =>
        c.toLowerCase().startsWith(text.toLowerCase())
      ).slice(0, 5);
      setCitySuggestions(matches);
    } else {
      setCitySuggestions([]);
    }
  }

  function onDraftCityChange(text: string) {
    setDraftFilters(f => ({ ...f, city: text }));
    if (text.length >= 2) {
      const matches = CIDADES_PORTUGAL.filter(c =>
        c.toLowerCase().startsWith(text.toLowerCase())
      ).slice(0, 5);
      setCitySuggestions(matches);
    } else {
      setCitySuggestions([]);
    }
  }

  const filteredProfiles = profiles
    .filter(p => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.full_name?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.bio?.toLowerCase().includes(q) ||
        p.specialties?.some(s => s.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => (b.premium ? 1 : 0) - (a.premium ? 1 : 0));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('discover.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/new-post')} style={styles.headerBtn}>
            <LinearGradient colors={colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={[styles.headerBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="person-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search + filtro */}
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('discover.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={onSearchChange}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => { setSearch(''); setCitySuggestions([]); }}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          {/* Sugestões de cidade */}
          {citySuggestions.length > 0 && (
            <View style={[styles.suggestions, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {citySuggestions.map(city => (
                <TouchableOpacity
                  key={city}
                  style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setSearch(city); setCitySuggestions([]); }}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={openFilters}
          style={[styles.filterIconBtn, !hasActiveFilters && { backgroundColor: colors.card }]}>
          {hasActiveFilters && <LinearGradient colors={colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />}
          <Ionicons name="options-outline" size={20} color={hasActiveFilters ? '#fff' : colors.text} />
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeFiltersRow}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: 'center' }}>
          {filters.type !== 'all' && (
            <View style={[styles.activeChip, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
              <Text style={[styles.activeChipText, { color: colors.accent }]}>{filters.type === 'professional' ? t('discover.professionals') : t('discover.spaces')}</Text>
              <TouchableOpacity onPress={() => setFilters(f => ({ ...f, type: 'all' }))}>
                <Ionicons name="close" size={12} color={colors.accent} />
              </TouchableOpacity>
            </View>
          )}
          {filters.city !== '' && (
            <View style={[styles.activeChip, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
              <Text style={[styles.activeChipText, { color: colors.accent }]}>📍 {filters.city}</Text>
              <TouchableOpacity onPress={() => setFilters(f => ({ ...f, city: '' }))}>
                <Ionicons name="close" size={12} color={colors.accent} />
              </TouchableOpacity>
            </View>
          )}
          {filters.specialty !== '' && (
            <View style={[styles.activeChip, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
              <Text style={[styles.activeChipText, { color: colors.accent }]}>{filters.specialty}</Text>
              <TouchableOpacity onPress={() => setFilters(f => ({ ...f, specialty: '' }))}>
                <Ionicons name="close" size={12} color={colors.accent} />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={clearFilters} style={[styles.activeChip, { backgroundColor: colors.card2, borderColor: colors.border }]}>
            <Text style={[styles.activeChipText, { color: colors.textSub }]}>{t('discover.clear')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : filteredProfiles.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('discover.noResultsTitle')}</Text>
          <Text style={[styles.emptySubText, { color: colors.textSub }]}>{t('discover.noResultsSub')}</Text>
          {hasActiveFilters && (
            <TouchableOpacity style={[styles.clearBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={clearFilters}>
              <Text style={[styles.clearBtnText, { color: colors.text }]}>{t('discover.clearFilters')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProfiles}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
              {filteredProfiles.length} {filteredProfiles.length !== 1 ? t('discover.resultsPlural') : t('discover.results')}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: item.premium ? '#f0a500' : colors.border, borderWidth: item.premium ? 1.5 : 1 }]}
              onPress={() => router.push({ pathname: '/profile-detail', params: { id: item.id } })}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.cardAvatarImg} />
              ) : (
                <View style={[styles.cardAvatar, { backgroundColor: colors.accent }]}>
                  <Text style={styles.cardAvatarText}>{item.full_name?.charAt(0).toUpperCase() ?? '?'}</Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {item.premium && <Ionicons name="star" size={14} color="#f0a500" />}
                  <Text style={[styles.cardName, { color: colors.text }]}>{item.full_name ?? t('discover.noName')}</Text>
                  {item.verified && <Ionicons name="checkmark-circle" size={15} color="#007aff" />}
                </View>
                <View style={styles.cardBadgeRow}>
                  <View style={[styles.badge, { backgroundColor: colors.card2 }]}>
                    <Text style={[styles.badgeText, { color: colors.textSub }]}>{item.user_type === 'professional' ? t('discover.professional') : t('discover.space')}</Text>
                  </View>
                  {item.city && <Text style={[styles.cardCity, { color: colors.textMuted }]}>📍 {item.city}</Text>}
                </View>
                {item.specialties && item.specialties.length > 0 && (
                  <Text style={[styles.cardSpecialties, { color: colors.accent }]} numberOfLines={1}>
                    {item.specialties.slice(0, 3).join(' · ')}
                  </Text>
                )}
                {item.bio && <Text style={[styles.cardBio, { color: colors.textSub }]} numberOfLines={1}>{item.bio}</Text>}
              </View>
              <TouchableOpacity style={styles.heartBtn} onPress={(e) => { e.stopPropagation(); toggleLike(item); }}>
                {likingId === item.id
                  ? <ActivityIndicator size="small" color={colors.accent} />
                  : <Ionicons name={likedIds.has(item.id) ? 'heart' : 'heart-outline'} size={22} color={colors.accent} />}
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal de filtros */}
      <Modal visible={showFilterModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilterModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSub }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('discover.filters')}</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={[styles.modalClear, { color: colors.accent }]}>{t('discover.clear')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Tipo */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('discover.profileType')}</Text>
            <View style={styles.typeRow}>
              {(['all', 'professional', 'space'] as const).map(typeOpt => (
                <TouchableOpacity
                  key={typeOpt}
                  style={[styles.typeBtn, { backgroundColor: colors.card, borderColor: colors.border },
                    draftFilters.type === typeOpt && { backgroundColor: colors.accentBg, borderColor: colors.accent }]}
                  onPress={() => setDraftFilters(f => ({ ...f, type: typeOpt }))}>
                  <Text style={[styles.typeBtnText, { color: draftFilters.type === typeOpt ? colors.accent : colors.textSub }]}>
                    {typeOpt === 'all' ? t('discover.all') : typeOpt === 'professional' ? t('discover.professionals') : t('discover.spaces')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cidade */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('discover.cityLabel')}</Text>
            <View>
              <View style={[styles.cityInput, { backgroundColor: colors.card, borderColor: draftFilters.city ? colors.accent : colors.border }]}>
                <Ionicons name="location-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.cityInputText, { color: colors.text }]}
                  placeholder={t('discover.cityHint')}
                  placeholderTextColor={colors.textMuted}
                  value={draftFilters.city}
                  onChangeText={onDraftCityChange}
                />
                {draftFilters.city.length > 0 && (
                  <TouchableOpacity onPress={() => { setDraftFilters(f => ({ ...f, city: '' })); setCitySuggestions([]); }}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              {citySuggestions.length > 0 && (
                <View style={[styles.suggestions, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {citySuggestions.map(city => (
                    <TouchableOpacity
                      key={city}
                      style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                      onPress={() => { setDraftFilters(f => ({ ...f, city })); setCitySuggestions([]); }}>
                      <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.suggestionText, { color: colors.text }]}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Especialidade */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('discover.specialtyLabel')}</Text>
            <View style={styles.specialtiesGrid}>
              {SPECIALTIES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.specialtyChip, { backgroundColor: colors.card, borderColor: colors.border },
                    draftFilters.specialty === s && { backgroundColor: colors.accentBg, borderColor: colors.accent }]}
                  onPress={() => setDraftFilters(f => ({ ...f, specialty: f.specialty === s ? '' : s }))}>
                  <Text style={[styles.specialtyChipText, { color: draftFilters.specialty === s ? colors.accent : colors.textSub }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.applyRow, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <LinearGradient colors={colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill} />
              <Text style={styles.applyBtnText}>{t('discover.apply')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...depthShadow },
  searchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, marginTop: 12, marginBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 15 },
  filterIconBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 0, overflow: 'hidden' },
  suggestions: { borderRadius: 12, borderWidth: 1, marginTop: 4, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  suggestionText: { fontSize: 14 },
  activeFiltersRow: { maxHeight: 36, marginBottom: 6 },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  activeChipText: { fontSize: 12, fontWeight: '600' },
  resultsCount: { fontSize: 12, marginBottom: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubText: { fontSize: 14, textAlign: 'center' },
  clearBtn: { marginTop: 8, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1 },
  clearBtnText: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderWidth: 1 },
  cardAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  cardAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  cardAvatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12 },
  cardCity: { fontSize: 12 },
  cardSpecialties: { fontSize: 12, fontWeight: '600' },
  cardBio: { fontSize: 13, marginTop: 2 },
  heartBtn: { padding: 4 },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalClear: { fontSize: 15 },
  modalBody: { padding: 20, gap: 14, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  typeBtnText: { fontSize: 12, fontWeight: '600' },
  cityInput: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5 },
  cityInputText: { flex: 1, fontSize: 15 },
  specialtiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specialtyChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  specialtyChipText: { fontSize: 13 },
  applyRow: { padding: 16, borderTopWidth: 1 },
  applyBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', overflow: 'hidden', ...depthShadow },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
