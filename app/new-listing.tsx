import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';

const CATEGORIES = ['Máquinas', 'Cadeiras/Mobiliário', 'Equipamento', 'Produtos', 'Outros'];
const CONDITIONS = ['Novo', 'Como novo', 'Bom estado', 'Usado'];

export default function NewListingScreen() {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [city, setCity] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pickImage() {
    if (images.length >= 5) { Alert.alert('Máximo de 5 fotos por anúncio'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão necessária'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.75, base64: true,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `listings/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, decode(asset.base64!), { contentType: `image/${ext}` });
      if (error) { Alert.alert('Erro ao carregar foto', error.message); return; }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setImages(prev => [...prev, data.publicUrl]);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }

  async function publish() {
    if (!title.trim()) { Alert.alert('Título obrigatório'); return; }
    if (!category) { Alert.alert('Selecciona uma categoria'); return; }
    if (!condition) { Alert.alert('Selecciona a condição'); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await supabase.from('marketplace_listings').insert({
        seller_id: session.user.id,
        title: title.trim(),
        description: description.trim() || null,
        price: negotiable ? null : (price ? parseFloat(price) : null),
        category,
        condition,
        city: city.trim() || null,
        images: images.length > 0 ? images : null,
        status: 'active',
      });
      if (error) { Alert.alert('Erro', error.message); return; }
      Alert.alert('Anúncio publicado!', 'O teu equipamento já está visível no Mercado.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={0}>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Novo Anúncio</Text>
        <TouchableOpacity
          style={[styles.publishBtn, { backgroundColor: colors.accent, opacity: saving ? 0.7 : 1 }]}
          onPress={publish} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.publishText}>Publicar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* Fotos */}
        <Text style={[styles.label, { color: colors.textMuted }]}>FOTOS ({images.length}/5)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>
          {images.map((uri, i) => (
            <View key={i} style={styles.imgWrap}>
              <Image source={{ uri }} style={styles.imgThumb} />
              <TouchableOpacity style={styles.imgRemove} onPress={() => removeImage(i)}>
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 5 && (
            <TouchableOpacity
              style={[styles.addPhoto, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={pickImage} disabled={uploading}>
              {uploading
                ? <ActivityIndicator color={colors.accent} />
                : <>
                    <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                    <Text style={[styles.addPhotoText, { color: colors.textMuted }]}>Adicionar</Text>
                  </>
              }
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Título */}
        <Text style={[styles.label, { color: colors.textMuted }]}>TÍTULO *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Ex: Cadeira hidráulica Maletti"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />

        {/* Descrição */}
        <Text style={[styles.label, { color: colors.textMuted }]}>DESCRIÇÃO</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Estado, marcas de uso, histórico, motivo de venda..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={1000}
        />

        {/* Preço */}
        <Text style={[styles.label, { color: colors.textMuted }]}>PREÇO</Text>
        <View style={styles.priceRow}>
          <View style={[styles.priceBox, { backgroundColor: colors.card, borderColor: colors.border, opacity: negotiable ? 0.4 : 1 }]}>
            <Text style={[styles.priceSymbol, { color: colors.textMuted }]}>€</Text>
            <TextInput
              style={[styles.priceInput, { color: colors.text }]}
              placeholder="0,00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
              editable={!negotiable}
            />
          </View>
          <TouchableOpacity
            style={[styles.negBtn, { backgroundColor: negotiable ? colors.accentBg : colors.card, borderColor: negotiable ? colors.accent : colors.border }]}
            onPress={() => { setNegotiable(!negotiable); if (!negotiable) setPrice(''); }}>
            <Text style={[styles.negBtnText, { color: negotiable ? colors.accent : colors.textSub }]}>A negociar</Text>
          </TouchableOpacity>
        </View>

        {/* Categoria */}
        <Text style={[styles.label, { color: colors.textMuted }]}>CATEGORIA *</Text>
        <View style={styles.chipsGrid}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border },
                category === c && { backgroundColor: colors.accentBg, borderColor: colors.accent }]}
              onPress={() => setCategory(c)}>
              <Text style={[styles.chipText, { color: category === c ? colors.accent : colors.textSub }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Condição */}
        <Text style={[styles.label, { color: colors.textMuted }]}>CONDIÇÃO *</Text>
        <View style={styles.chipsGrid}>
          {CONDITIONS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border },
                condition === c && { backgroundColor: colors.accentBg, borderColor: colors.accent }]}
              onPress={() => setCondition(c)}>
              <Text style={[styles.chipText, { color: condition === c ? colors.accent : colors.textSub }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cidade */}
        <Text style={[styles.label, { color: colors.textMuted }]}>CIDADE</Text>
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="location-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.inputInline, { color: colors.text }]}
            placeholder="Ex: Porto"
            placeholderTextColor={colors.textMuted}
            value={city}
            onChangeText={setCity}
          />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  publishBtn: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  publishText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  body: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 6 },
  imagesRow: { gap: 10, paddingVertical: 4 },
  imgWrap: { position: 'relative' },
  imgThumb: { width: 90, height: 90, borderRadius: 12 },
  imgRemove: { position: 'absolute', top: -6, right: -6 },
  addPhoto: { width: 90, height: 90, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoText: { fontSize: 11, fontWeight: '600' },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, borderWidth: 1 },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 13 },
  priceRow: { flexDirection: 'row', gap: 10 },
  priceBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1 },
  priceSymbol: { fontSize: 16, fontWeight: '700' },
  priceInput: { flex: 1, fontSize: 16, fontWeight: '600' },
  negBtn: { borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  negBtnText: { fontSize: 13, fontWeight: '700' },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1 },
  inputInline: { flex: 1, fontSize: 15 },
});
