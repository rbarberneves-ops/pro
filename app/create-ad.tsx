import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
  Image, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { GradientButton } from '@/lib/animated';

const DURATIONS = [
  { days: 3,  label: '3 dias',   price: 9.99 },
  { days: 7,  label: '7 dias',   price: 19.99, popular: true },
  { days: 14, label: '14 dias',  price: 34.99 },
  { days: 30, label: '30 dias',  price: 59.99 },
];

export default function CreateAdScreen() {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [ctaText, setCtaText] = useState('Ver mais');
  const [ctaLink, setCtaLink] = useState('');
  const [selectedDays, setSelectedDays] = useState(7);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const plan = DURATIONS.find(d => d.days === selectedDays)!;

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão necessária'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 9], quality: 0.8, base64: true,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  }

  async function publish() {
    if (!title.trim()) { Alert.alert('Título obrigatório'); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let imageUrl: string | null = null;
      if (imageBase64) {
        const ext = 'jpg';
        const path = `ads/${session.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('portfolio')
          .upload(path, decode(imageBase64), { contentType: 'image/jpeg', upsert: true });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('portfolio').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      const startsAt = new Date();
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + selectedDays);

      const { error } = await supabase.from('store_ads').insert({
        store_id: session.user.id,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        cta_text: ctaText.trim() || 'Ver mais',
        cta_link: ctaLink.trim() || null,
        image_url: imageUrl,
        duration_days: selectedDays,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        price_paid: plan.price,
        active: true, // em produção só ativa após pagamento
      });
      if (error) throw error;

      Alert.alert('Anúncio publicado!', `O teu banner vai aparecer no feed durante ${selectedDays} dias.`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Criar anúncio</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Preview */}
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>PATROCINADO</Text>
            </View>
            <TouchableOpacity onPress={pickImage} style={styles.imageArea}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              ) : (
                <LinearGradient colors={colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={36} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.imagePlaceholderText}>Toca para adicionar imagem</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
            <View style={styles.previewContent}>
              <Text style={[styles.previewTitle, { color: colors.text }]}>{title || 'Título do anúncio'}</Text>
              {(subtitle || true) && (
                <Text style={[styles.previewSubtitle, { color: colors.textSub }]}>{subtitle || 'Subtítulo opcional'}</Text>
              )}
              <View style={[styles.previewCta, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
                <Text style={[styles.previewCtaText, { color: colors.accent }]}>{ctaText || 'Ver mais'}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.accent} />
              </View>
            </View>
          </View>

          {/* Campos */}
          <Text style={[styles.label, { color: colors.textSub }]}>Título *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            value={title} onChangeText={setTitle}
            placeholder="Ex: Nova linha de produtos PRO"
            placeholderTextColor={colors.textMuted} maxLength={60}
          />
          <Text style={[styles.charCount, { color: colors.textMuted }]}>{title.length}/60</Text>

          <Text style={[styles.label, { color: colors.textSub }]}>Subtítulo</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            value={subtitle} onChangeText={setSubtitle}
            placeholder="Breve descrição do teu anúncio"
            placeholderTextColor={colors.textMuted} maxLength={100}
          />

          <Text style={[styles.label, { color: colors.textSub }]}>Texto do botão</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            value={ctaText} onChangeText={setCtaText}
            placeholder="Ver mais"
            placeholderTextColor={colors.textMuted} maxLength={30}
          />

          <Text style={[styles.label, { color: colors.textSub }]}>Link (opcional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            value={ctaLink} onChangeText={setCtaLink}
            placeholder="https://www.tualoja.pt"
            placeholderTextColor={colors.textMuted}
            keyboardType="url" autoCapitalize="none"
          />

          {/* Duração */}
          <Text style={[styles.label, { color: colors.textSub }]}>Duração</Text>
          <View style={styles.durationGrid}>
            {DURATIONS.map(d => {
              const active = selectedDays === d.days;
              return (
                <TouchableOpacity
                  key={d.days}
                  style={[styles.durationCard, { backgroundColor: colors.card, borderColor: active ? colors.accent : colors.border }]}
                  onPress={() => setSelectedDays(d.days)}>
                  {d.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>POPULAR</Text>
                    </View>
                  )}
                  {active && <LinearGradient colors={colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:0}} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />}
                  <Text style={[styles.durationDays, { color: active ? '#fff' : colors.text }]}>{d.label}</Text>
                  <Text style={[styles.durationPrice, { color: active ? 'rgba(255,255,255,0.9)' : colors.accent }]}>€{d.price.toFixed(2)}</Text>
                  {active && <Ionicons name="checkmark-circle" size={18} color="#fff" style={styles.durationCheck} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Resumo */}
          <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSub }]}>Duração</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{plan.label}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSub }]}>Alcance estimado</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {plan.days === 3 ? '500–1k' : plan.days === 7 ? '1k–3k' : plan.days === 14 ? '3k–7k' : '8k–15k'} impressões
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: '700' }]}>Total</Text>
              <Text style={[styles.summaryValue, { color: colors.accent, fontSize: 20, fontWeight: '800' }]}>€{plan.price.toFixed(2)}</Text>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* CTA fixo */}
        <View style={[styles.ctaBar, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <GradientButton
            onPress={publish}
            disabled={saving || !title.trim()}
            gradientColors={colors.accentGradient}
            style={{ opacity: saving || !title.trim() ? 0.6 : 1 }}
            innerStyle={styles.ctaInner}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="megaphone-outline" size={20} color="#fff" />
                  <Text style={styles.ctaText}>Publicar anúncio — €{plan.price.toFixed(2)}</Text>
                </>}
          </GradientButton>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: 16, gap: 4 },
  previewCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20, position: 'relative' },
  previewBadge: { position: 'absolute', top: 10, left: 10, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  previewBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  imageArea: { width: '100%', aspectRatio: 16/9 },
  previewImage: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 8 },
  imagePlaceholderText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  previewContent: { padding: 14, gap: 6 },
  previewTitle: { fontSize: 16, fontWeight: '800' },
  previewSubtitle: { fontSize: 13, lineHeight: 18 },
  previewCta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, marginTop: 4 },
  previewCtaText: { fontSize: 13, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
  input: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, borderWidth: 1 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  durationCard: { width: '47%', borderRadius: 12, borderWidth: 1.5, padding: 14, alignItems: 'center', gap: 4, overflow: 'hidden', position: 'relative', minHeight: 80, justifyContent: 'center' },
  popularBadge: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#f0a500', paddingVertical: 3, alignItems: 'center' },
  popularText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  durationDays: { fontSize: 15, fontWeight: '700', marginTop: 8 },
  durationPrice: { fontSize: 18, fontWeight: '800' },
  durationCheck: { position: 'absolute', bottom: 8, right: 8 },
  summary: { borderRadius: 14, borderWidth: 1, marginTop: 20, overflow: 'hidden' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  summaryTotal: { borderTopWidth: StyleSheet.hairlineWidth },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, borderTopWidth: 1 },
  ctaInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
