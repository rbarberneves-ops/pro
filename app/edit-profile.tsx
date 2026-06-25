import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';

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

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL  = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

type DaySlot = { start: string; end: string };
type Availability = Partial<Record<number, DaySlot>>; // key = 0..6

const SPECIALTIES_OPTIONS = [
  'Corte de cabelo', 'Barba', 'Coloração', 'Mechas', 'Extensões',
  'Manicure', 'Pedicure', 'Sobrancelhas', 'Maquilhagem', 'Massagem',
  'Depilação', 'Tratamentos faciais', 'Penteados', 'Alisamento',
];

function CityAutocomplete({ value, onSelect, colors, forSpace, onGeocode }: {
  value: string;
  onSelect: (city: string) => void;
  colors: any;
  forSpace?: boolean;
  onGeocode?: (lat: number, lng: number) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  return (
    <View style={{ position: 'relative', zIndex: 20 }}>
      <TextInput
        style={[{ borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, fontSize: 16, borderWidth: 1, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
        value={value}
        onChangeText={t => {
          onSelect(t);
          if (t.length >= 2) {
            const q = t.toLowerCase();
            setSuggestions(CIDADES_PORTUGAL.filter(c => c.toLowerCase().startsWith(q)).slice(0, 5));
          } else {
            setSuggestions([]);
          }
        }}
        placeholderTextColor={colors.textMuted}
        placeholder="Lisboa, Porto..."
        autoCorrect={false}
      />
      {suggestions.length > 0 && (
        <View style={[{ position: 'absolute', top: '100%', left: 0, right: 0, borderRadius: 14, borderWidth: 1, overflow: 'hidden', zIndex: 999, elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {suggestions.map(c => (
            <TouchableOpacity
              key={c}
              style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 }, { borderBottomColor: colors.border }]}
              onPress={async () => {
                onSelect(c);
                setSuggestions([]);
                if (forSpace && onGeocode) {
                  try {
                    const res = await fetch(
                      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(c + ', Portugal')}&format=json&limit=1`,
                      { headers: { 'User-Agent': 'PROApp/1.0' } }
                    );
                    const json = await res.json();
                    if (json?.[0]) onGeocode(parseFloat(json[0].lat), parseFloat(json[0].lon));
                  } catch (_) {}
                }
              }}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={{ fontSize: 15, color: colors.text }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [userType, setUserType] = useState<'professional' | 'space' | 'store'>('professional');

  // Store fields
  const [storeName, setStoreName] = useState('');
  const [storeType, setStoreType] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [yearsExp, setYearsExp] = useState('');
  const [address, setAddress] = useState('');
  const [street, setStreet] = useState('');
  const [doorNumber, setDoorNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [capacity, setCapacity] = useState('');
  const [spaceName, setSpaceName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [availability, setAvailability] = useState<Availability>({});

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUserId(session.user.id);

    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) {
      setUserType(data.user_type ?? 'professional');
      setFullName(data.full_name ?? '');
      setUsername(data.username ?? '');
      setBio(data.bio ?? '');
      setCity(data.city ?? '');
      setPhone(data.phone ?? '');
      setSpecialties(data.specialties ?? []);
      setAvatarUrl(data.avatar_url ?? null);
      setPortfolioUrls(data.portfolio_urls ?? []);
    }

    if (data?.user_type === 'store') {
      const { data: store } = await supabase.from('stores').select('*').eq('id', session.user.id).single();
      if (store) {
        setStoreName(store.store_name ?? '');
        setStoreType(store.store_type ?? '');
        setWebsite(store.website ?? '');
        setInstagram(store.instagram ?? '');
      }
    } else if (data?.user_type === 'professional') {
      const { data: prof } = await supabase.from('professionals').select('*').eq('id', session.user.id).single();
      if (prof) setYearsExp(prof.experience_years?.toString() ?? '');
    } else {
      const { data: space } = await supabase.from('spaces').select('*').eq('id', session.user.id).single();
      if (space) {
        setSpaceName(space.space_name ?? '');
        setAddress(space.address ?? '');
        setStreet(space.street ?? '');
        setDoorNumber(space.door_number ?? '');
        setPostalCode(space.postal_code ?? '');
        setCapacity(space.capacity?.toString() ?? '');
        setLatitude(space.latitude ?? null);
        setLongitude(space.longitude ?? null);
      }
      // Load availability
      const { data: avRows } = await supabase
        .from('availability')
        .select('day_of_week, start_time, end_time')
        .eq('space_id', session.user.id);
      if (avRows && avRows.length > 0) {
        const av: Availability = {};
        for (const row of avRows) {
          av[row.day_of_week] = {
            start: row.start_time.slice(0, 5),
            end: row.end_time.slice(0, 5),
          };
        }
        setAvailability(av);
      }
    }
    setLoading(false);
  }

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${userId}/avatar.${ext}`;
      const arrayBuffer = decode(asset.base64!);

      const { error } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
        contentType: `image/${ext}`,
        upsert: true,
      });
      if (error) throw error;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = data.publicUrl + '?t=' + Date.now();
      setAvatarUrl(url);
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
    } catch (e: any) {
      Alert.alert('Erro no upload', e.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function pickPortfolioPhoto() {
    if (portfolioUrls.length >= 9) {
      Alert.alert('Limite atingido', 'Podes ter no máximo 9 fotos de trabalho.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;

    setUploadingPortfolio(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${userId}/${Date.now()}.${ext}`;
      const arrayBuffer = decode(asset.base64!);

      const { error } = await supabase.storage.from('portfolio').upload(path, arrayBuffer, {
        contentType: `image/${ext}`,
        upsert: false,
      });
      if (error) throw error;

      const { data } = supabase.storage.from('portfolio').getPublicUrl(path);
      const newUrls = [...portfolioUrls, data.publicUrl];
      setPortfolioUrls(newUrls);
      await supabase.from('profiles').update({ portfolio_urls: newUrls }).eq('id', userId);
    } catch (e: any) {
      Alert.alert('Erro no upload', e.message);
    } finally {
      setUploadingPortfolio(false);
    }
  }

  async function removePortfolioPhoto(url: string) {
    const newUrls = portfolioUrls.filter(u => u !== url);
    setPortfolioUrls(newUrls);
    await supabase.from('profiles').update({ portfolio_urls: newUrls }).eq('id', userId);
  }

  function toggleSpecialty(s: string) {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function save() {
    if (!fullName.trim()) { Alert.alert('Erro', 'O nome é obrigatório'); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.from('profiles').update({
        full_name: fullName.trim(),
        username: username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '') || null,
        bio: bio.trim(), city: city.trim(),
        phone: phone.trim(), specialties, updated_at: new Date().toISOString(),
      }).eq('id', session.user.id);

      // Save availability for spaces
      if (userType === 'space') {
        await supabase.from('availability').delete().eq('space_id', session.user.id);
        const rows = Object.entries(availability)
          .filter(([, slot]) => slot)
          .map(([day, slot]) => ({
            space_id: session.user.id,
            day_of_week: parseInt(day),
            start_time: slot!.start,
            end_time: slot!.end,
          }));
        if (rows.length > 0) {
          await supabase.from('availability').insert(rows);
        }
      }

      if (userType === 'store') {
        const { error: storeError } = await supabase.from('stores').upsert({
          id: session.user.id,
          store_name: storeName.trim() || fullName.trim(),
          store_type: storeType.trim(),
          website: website.trim(),
          instagram: instagram.trim().replace('@', ''),
        });
        if (storeError) throw storeError;
      } else if (userType === 'professional') {
        const { error: profError } = await supabase.from('professionals').upsert({
          id: session.user.id,
          experience_years: yearsExp ? parseInt(yearsExp) : null,
          specialties,
        });
        if (profError) throw profError;
      } else {
        const fullAddress = [street.trim(), doorNumber.trim(), postalCode.trim(), city.trim()].filter(Boolean).join(', ');
        const { error: spaceError } = await supabase.from('spaces').upsert({
          id: session.user.id,
          space_name: spaceName.trim() || fullName.trim(),
          address: fullAddress,
          street: street.trim(),
          door_number: doorNumber.trim(),
          postal_code: postalCode.trim(),
          city: city.trim(),
          capacity: capacity ? parseInt(capacity) : null,
          bio: bio.trim(),
          latitude,
          longitude,
        });
        if (spaceError) throw spaceError;
      }

      Alert.alert('Guardado!', 'Perfil actualizado.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ActivityIndicator color={colors.accent} style={{ marginTop: 80 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Editar Perfil</Text>
          <TouchableOpacity onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.accent} size="small" />
              : <Text style={[styles.saveBtn, { color: colors.accent }]}>Guardar</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar}>
              {uploadingAvatar ? (
                <View style={styles.avatar}><ActivityIndicator color="#fff" /></View>
              ) : avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{fullName.charAt(0).toUpperCase() || '?'}</Text>
                </View>
              )}
              <View style={[styles.avatarEditBadge, { backgroundColor: colors.card2, borderColor: colors.bg }]}>
                <Ionicons name="camera" size={14} color={colors.text} />
              </View>
            </TouchableOpacity>
            <Text style={[styles.changePhoto, { color: colors.textSub }]}>Toca para alterar foto de perfil</Text>
          </View>

          <Text style={[styles.label, { color: colors.textSub }]}>Nome completo *</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={fullName} onChangeText={setFullName} placeholderTextColor={colors.textMuted} placeholder="O teu nome" />

          <Text style={[styles.label, { color: colors.textSub }]}>Username</Text>
          <View style={styles.usernameRow}>
            <Text style={styles.usernameAt}>@</Text>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={username}
              onChangeText={t => setUsername(t.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
              placeholderTextColor={colors.textMuted}
              placeholder="o_teu_username"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Cidade — só para profissionais (espaços têm no bloco próprio) */}
          {userType === 'professional' && (
            <>
              <Text style={[styles.label, { color: colors.textSub }]}>Cidade</Text>
              <CityAutocomplete
                value={city} onSelect={setCity}
                colors={colors} forSpace={false}
              />
            </>
          )}

          <Text style={[styles.label, { color: colors.textSub }]}>Telefone</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={phone} onChangeText={setPhone} placeholderTextColor={colors.textMuted} placeholder="+351 9xx xxx xxx" keyboardType="phone-pad" />

          <Text style={[styles.label, { color: colors.textSub }]}>Bio</Text>
          <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={bio} onChangeText={setBio}
            placeholderTextColor={colors.textMuted} placeholder="Apresenta-te brevemente..." multiline numberOfLines={4} />

          {userType === 'store' && <>
            <Text style={[styles.label, { color: colors.textSub }]}>Nome da loja</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={storeName} onChangeText={setStoreName} placeholderTextColor={colors.textMuted} placeholder="Ex: ProBeauty Store" />

            <Text style={[styles.label, { color: colors.textSub }]}>Tipo de loja</Text>
            <View style={styles.specialtiesGrid}>
              {['Produtos capilares', 'Equipamentos', 'Mobiliário', 'Cosméticos', 'Maquilhagem', 'Formação', 'Outros'].map(t => (
                <TouchableOpacity key={t}
                  style={[styles.specialty, { backgroundColor: colors.card, borderColor: colors.border }, storeType === t && { backgroundColor: colors.accentBg, borderColor: colors.accent }]}
                  onPress={() => setStoreType(t)}>
                  <Text style={[styles.specialtyText, { color: colors.textSub }, storeType === t && { color: colors.accent }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSub }]}>Cidade</Text>
            <CityAutocomplete value={city} onSelect={setCity} colors={colors} />

            <Text style={[styles.label, { color: colors.textSub }]}>Website</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={website} onChangeText={setWebsite} placeholderTextColor={colors.textMuted} placeholder="https://www.loja.pt" keyboardType="url" autoCapitalize="none" />

            <Text style={[styles.label, { color: colors.textSub }]}>Instagram</Text>
            <View style={styles.usernameRow}>
              <Text style={styles.usernameAt}>@</Text>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                value={instagram}
                onChangeText={t => setInstagram(t.replace('@', ''))}
                placeholderTextColor={colors.textMuted}
                placeholder="loja_instagram"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </>}

          {userType === 'professional' && <>
            <Text style={[styles.label, { color: colors.textSub }]}>Anos de experiência</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={yearsExp} onChangeText={setYearsExp}
              placeholderTextColor={colors.textMuted} placeholder="Ex: 5" keyboardType="numeric" />
            <Text style={[styles.label, { color: colors.textSub }]}>Especialidades</Text>
            <View style={styles.specialtiesGrid}>
              {SPECIALTIES_OPTIONS.map(s => (
                <TouchableOpacity key={s}
                  style={[styles.specialty, { backgroundColor: colors.card, borderColor: colors.border }, specialties.includes(s) && { backgroundColor: colors.accentBg, borderColor: colors.accent }]}
                  onPress={() => toggleSpecialty(s)}>
                  <Text style={[styles.specialtyText, { color: colors.textSub }, specialties.includes(s) && { color: colors.accent }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>}

          {userType === 'space' && <>
            <Text style={[styles.label, { color: colors.textSub }]}>Nome do espaço</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={spaceName} onChangeText={setSpaceName} placeholderTextColor={colors.textMuted} placeholder="Ex: Barbearia do João" />

            {/* Morada estruturada */}
            <Text style={[styles.label, { color: colors.textSub }]}>Rua</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={street} onChangeText={setStreet} placeholderTextColor={colors.textMuted} placeholder="Ex: Rua de Santa Catarina" />
            <View style={styles.addressRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSub }]}>Nº</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={doorNumber} onChangeText={setDoorNumber} placeholderTextColor={colors.textMuted} placeholder="123" keyboardType="numeric" />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={[styles.label, { color: colors.textSub }]}>Código Postal</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={postalCode} onChangeText={setPostalCode} placeholderTextColor={colors.textMuted} placeholder="4000-001" keyboardType="numbers-and-punctuation" maxLength={8} />
              </View>
            </View>
            <Text style={[styles.label, { color: colors.textSub }]}>Cidade</Text>
            <CityAutocomplete
              value={city} onSelect={setCity}
              colors={colors} forSpace
              onGeocode={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
            />
            <Text style={[styles.label, { color: colors.textSub }]}>Vagas disponíveis</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={capacity} onChangeText={setCapacity} placeholderTextColor={colors.textMuted} placeholder="Ex: 4" keyboardType="numeric" />
            {/* Disponibilidade */}
            <Text style={[styles.label, { color: colors.textSub }]}>Disponibilidade</Text>
            <View style={styles.daysRow}>
              {DAYS_SHORT.map((d, i) => {
                const active = !!availability[i];
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayChip, { backgroundColor: active ? colors.accent : colors.card, borderColor: active ? colors.accent : colors.border }]}
                    onPress={() => {
                      setAvailability(prev => {
                        const next = { ...prev };
                        if (next[i]) { delete next[i]; }
                        else { next[i] = { start: '09:00', end: '18:00' }; }
                        return next;
                      });
                    }}>
                    <Text style={[styles.dayChipText, { color: active ? '#fff' : colors.textSub }]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {[1, 2, 3, 4, 5, 6, 0].filter(i => !!availability[i]).map(i => (
              <View key={i} style={[styles.daySlotRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.daySlotName, { color: colors.text }]}>{DAYS_FULL[i]}</Text>
                <View style={styles.daySlotTimes}>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    value={availability[i]?.start ?? '09:00'}
                    onChangeText={v => setAvailability(prev => ({ ...prev, [i]: { ...prev[i]!, start: v } }))}
                    placeholder="09:00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <Text style={[styles.daySlotSep, { color: colors.textMuted }]}>–</Text>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    value={availability[i]?.end ?? '18:00'}
                    onChangeText={v => setAvailability(prev => ({ ...prev, [i]: { ...prev[i]!, end: v } }))}
                    placeholder="18:00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>
            ))}

            <Text style={[styles.label, { color: colors.textSub }]}>Localização no mapa</Text>
            {latitude && (
              <View style={[styles.coordsBadge, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                <Text style={[styles.coordsText, { color: colors.accent }]}>
                  📍 {latitude.toFixed(5)}, {longitude?.toFixed(5)}
                </Text>
                <TouchableOpacity onPress={() => { setLatitude(null); setLongitude(null); }}>
                  <Ionicons name="close-circle" size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.locationBtnsRow}>
              {/* Geocodificar pela morada completa */}
              <TouchableOpacity
                style={[styles.locationBtn, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={async () => {
                  if (!address.trim() && !city.trim()) {
                    Alert.alert('Preenche a morada e cidade primeiro.');
                    return;
                  }
                  setGettingLocation(true);
                  try {
                    const query = [address.trim(), city.trim(), 'Portugal'].filter(Boolean).join(', ');
                    const res = await fetch(
                      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
                      { headers: { 'User-Agent': 'PROApp/1.0' } }
                    );
                    const json = await res.json();
                    if (json && json[0]) {
                      setLatitude(parseFloat(json[0].lat));
                      setLongitude(parseFloat(json[0].lon));
                    } else {
                      Alert.alert('Não encontrado', 'Verifica a morada e tenta novamente.');
                    }
                  } catch (e: any) {
                    Alert.alert('Erro', e.message);
                  } finally {
                    setGettingLocation(false);
                  }
                }}
                disabled={gettingLocation}>
                {gettingLocation
                  ? <ActivityIndicator size="small" color={colors.accent} />
                  : <><Ionicons name="home-outline" size={16} color={colors.textSub} />
                      <Text style={[styles.locationBtnText, { color: colors.textSub, fontSize: 13 }]}>Usar morada</Text>
                    </>}
              </TouchableOpacity>
              {/* GPS */}
              <TouchableOpacity
                style={[styles.locationBtn, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={async () => {
                  setGettingLocation(true);
                  try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') { Alert.alert('Permissão negada', 'Activa a localização nas definições.'); return; }
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    setLatitude(loc.coords.latitude);
                    setLongitude(loc.coords.longitude);
                  } catch (e: any) {
                    Alert.alert('Erro', e.message);
                  } finally {
                    setGettingLocation(false);
                  }
                }}
                disabled={gettingLocation}>
                {gettingLocation
                  ? <ActivityIndicator size="small" color={colors.accent} />
                  : <><Ionicons name="navigate-outline" size={16} color={colors.textSub} />
                      <Text style={[styles.locationBtnText, { color: colors.textSub, fontSize: 13 }]}>GPS atual</Text>
                    </>}
              </TouchableOpacity>
            </View>
          </>}

          <Text style={[styles.label, { color: colors.textSub }]}>
            {userType === 'professional' ? 'Fotos de trabalho' : userType === 'store' ? 'Fotos da loja' : 'Fotos do espaço'} ({portfolioUrls.length}/9)
          </Text>
          <View style={styles.portfolioGrid}>
            {portfolioUrls.map((url) => (
              <View key={url} style={styles.portfolioItem}>
                <Image source={{ uri: url }} style={styles.portfolioImg} />
                <TouchableOpacity style={styles.portfolioRemove} onPress={() => removePortfolioPhoto(url)}>
                  <Ionicons name="close-circle" size={22} color={colors.accent} />
                </TouchableOpacity>
              </View>
            ))}
            {portfolioUrls.length < 9 && (
              <TouchableOpacity style={[styles.portfolioAdd, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickPortfolioPhoto} disabled={uploadingPortfolio}>
                {uploadingPortfolio
                  ? <ActivityIndicator color={colors.accent} />
                  : <><Ionicons name="add" size={28} color={colors.textMuted} /><Text style={[styles.portfolioAddText, { color: colors.textMuted }]}>Adicionar</Text></>}
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  saveBtn: { fontSize: 16, fontWeight: '700' },
  scroll: { padding: 20, gap: 6 },
  avatarSection: { alignItems: 'center', marginBottom: 24, gap: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#e94560', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, borderRadius: 12, padding: 4, borderWidth: 2 },
  changePhoto: { fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, fontSize: 16, borderWidth: 1 },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usernameAt: { color: '#e94560', fontSize: 20, fontWeight: '700', paddingBottom: 2 },
  textArea: { height: 110, textAlignVertical: 'top' },
  specialtiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specialty: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  specialtyText: { fontSize: 13, fontWeight: '600' },
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  portfolioItem: { position: 'relative' },
  portfolioImg: { width: 100, height: 100, borderRadius: 12 },
  portfolioRemove: { position: 'absolute', top: -6, right: -6 },
  portfolioAdd: { width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  portfolioAddText: { fontSize: 11 },
  locationBtnsRow: { flexDirection: 'row', gap: 10 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1 },
  locationBtnText: { fontSize: 14, fontWeight: '600' },
  coordsBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, marginBottom: 8 },
  coordsText: { flex: 1, fontSize: 13, fontWeight: '600' },
  addressRow: { flexDirection: 'row', gap: 10 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  dayChipText: { fontSize: 13, fontWeight: '700' },
  daySlotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, marginTop: 8 },
  daySlotName: { fontSize: 14, fontWeight: '600', flex: 1 },
  daySlotTimes: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  daySlotSep: { fontSize: 16, fontWeight: '600' },
  timeInput: { width: 64, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, borderWidth: 1, textAlign: 'center' },
});
