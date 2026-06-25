import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  TouchableOpacity, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const POST_TYPES = [
  { key: 'general', label: '📝 Geral', desc: 'Partilha algo com a comunidade' },
  { key: 'portfolio', label: '🖼️ Portfolio', desc: 'Mostra o teu trabalho' },
  { key: 'job', label: '💼 Oferta de emprego', desc: 'Procuras ou ofereces trabalho' },
  { key: 'event', label: '📅 Evento', desc: 'Anuncia um evento ou promoção' },
  { key: 'ad', label: '📢 Anúncio', desc: 'Promove a tua loja ou produto' },
];

const STORE_POST_TYPES = [
  { key: 'ad', label: '📢 Anúncio', desc: 'Promove a tua loja ou produto' },
];

export default function NewPostScreen() {
  const { colors } = useTheme();
  const [postType, setPostType] = useState('general');
  const [userType, setUserType] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from('profiles').select('user_type').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data?.user_type === 'store') {
            setUserType('store');
            setPostType('ad');
          }
        });
    });
  }, []);
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [publishing, setPublishing] = useState(false);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Preciso de acesso à galeria para adicionar fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      setImageMime(result.assets[0].mimeType ?? 'image/jpeg');
    }
  }

  async function publish() {
    if (!content.trim() && !image) {
      Alert.alert('Publicação vazia', 'Escreve algo ou adiciona uma foto.');
      return;
    }
    setPublishing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      let imageUrl: string | null = null;

      if (image) {
        const ext = imageMime.split('/')[1] ?? 'jpg';
        const fileName = `posts/${session.user.id}/${Date.now()}.${ext}`;
        const response = await fetch(image);
        const blob = await response.blob();
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, arrayBuffer, { contentType: imageMime, upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('posts').insert({
        user_id: session.user.id,
        content: content.trim(),
        image_url: imageUrl,
        post_type: postType,
        likes_count: 0,
      });
      if (error) throw error;

      router.back();
    } catch (e: any) {
      Alert.alert('Erro ao publicar', e.message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.textSub }]}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Nova publicação</Text>
          <TouchableOpacity
            style={[styles.publishBtn, (publishing || (!content.trim() && !image)) && { opacity: 0.4 }]}
            onPress={publish}
            disabled={publishing || (!content.trim() && !image)}>
            <LinearGradient colors={colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:0}} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
            {publishing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.publishText}>Publicar</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Tipo de publicação</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {(userType === 'store' ? STORE_POST_TYPES : POST_TYPES).map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeChip, { backgroundColor: colors.card, borderColor: colors.border }, postType === t.key && { backgroundColor: colors.accentBg, borderColor: colors.accent }]}
                  onPress={() => setPostType(t.key)}>
                  <Text style={[styles.typeChipText, { color: colors.textSub }, postType === t.key && { color: colors.accent }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.typeDesc, { color: colors.textMuted }]}>
              {POST_TYPES.find(t => t.key === postType)?.desc}
            </Text>
          </View>

          <View style={styles.section}>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              multiline
              numberOfLines={6}
              placeholder={
                postType === 'job'
                  ? 'Descreve a oferta: vaga, requisitos, localização, contacto...'
                  : postType === 'event'
                  ? 'Descreve o evento: data, local, promoção...'
                  : 'O que tens para partilhar?'
              }
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={setContent}
              maxLength={2000}
            />
            <Text style={[styles.charCount, { color: colors.textMuted }]}>{content.length}/2000</Text>
          </View>

          {image ? (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
              <TouchableOpacity style={[styles.removeImageBtn, { backgroundColor: colors.bg }]} onPress={() => setImage(null)}>
                <Ionicons name="close-circle" size={28} color={colors.accent} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.addImageBtn, { borderColor: colors.border }]} onPress={pickImage}>
              <Ionicons name="image-outline" size={28} color={colors.textMuted} />
              <Text style={[styles.addImageText, { color: colors.textMuted }]}>Adicionar foto</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: { fontSize: 15 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  publishBtn: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, overflow: 'hidden' },
  publishText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  typeRow: { gap: 8, paddingRight: 16 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  typeDesc: { fontSize: 13, marginTop: 8 },
  textArea: { borderRadius: 14, padding: 16, fontSize: 16, lineHeight: 24, textAlignVertical: 'top', minHeight: 160, borderWidth: 1 },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 6 },
  addImageBtn: { marginHorizontal: 16, marginTop: 20, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', height: 120, alignItems: 'center', justifyContent: 'center', gap: 8 },
  addImageText: { fontSize: 15 },
  imagePreviewWrap: { marginHorizontal: 16, marginTop: 20, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  imagePreview: { width: '100%', height: 240 },
  removeImageBtn: { position: 'absolute', top: 10, right: 10, borderRadius: 14 },
});
