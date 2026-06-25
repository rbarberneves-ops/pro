import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, ActivityIndicator, Alert, Dimensions,
  Modal, TextInput, KeyboardAvoidingView, Platform, Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 3) / 3;

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type AvSlot = { start: string; end: string };

type Profile = {
  id: string;
  full_name: string;
  username?: string;
  user_type: 'professional' | 'space' | 'store';
  avatar_url?: string;
  bio?: string;
  city?: string;
  specialties?: string[];
  portfolio_urls?: string[];
  verified?: boolean;
  premium?: boolean;
};

type Review = {
  id: string;
  reviewer_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  reviewer?: { full_name: string; avatar_url?: string };
};

function Stars({ rating, size = 16, onPress }: { rating: number; size?: number; onPress?: (r: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <TouchableOpacity key={i} onPress={() => onPress?.(i)} disabled={!onPress}>
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={size}
            color={i <= rating ? '#FFB800' : '#888'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ProfileDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [extra, setExtra] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [availability, setAvailability] = useState<Partial<Record<number, AvSlot>>>({});

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [draftRating, setDraftRating] = useState(5);
  const [draftComment, setDraftComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Report
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setCurrentUserId(session.user.id);

    const { data: p } = await supabase.from('profiles').select('*').eq('id', id).single();
    setProfile(p);

    if (p?.user_type === 'professional') {
      const { data } = await supabase.from('professionals').select('*').eq('id', id).single();
      setExtra(data);
    } else if (p?.user_type === 'space') {
      const { data } = await supabase.from('spaces').select('*').eq('id', id).single();
      setExtra(data);
    } else if (p?.user_type === 'store') {
      const { data } = await supabase.from('stores').select('*').eq('id', id).single();
      setExtra(data);
    }

    if (p?.user_type === 'space') {
      const { data: avRows } = await supabase
        .from('availability')
        .select('day_of_week, start_time, end_time')
        .eq('space_id', id)
        .order('day_of_week');
      if (avRows && avRows.length > 0) {
        const av: Partial<Record<number, AvSlot>> = {};
        for (const row of avRows) {
          av[row.day_of_week] = { start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) };
        }
        setAvailability(av);
      }
    }

    const { data: existingLike } = await supabase
      .from('likes').select('id')
      .eq('from_user', session.user.id).eq('to_user', id).maybeSingle();
    setLiked(!!existingLike);

    await loadReviews(session.user.id);
    setLoading(false);
  }

  async function loadReviews(uid: string) {
    const { data: rawReviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('reviewed_id', id)
      .order('created_at', { ascending: false });

    if (!rawReviews || rawReviews.length === 0) { setReviews([]); setAvgRating(0); return; }

    const reviewerIds = rawReviews.map((r: any) => r.reviewer_id);
    const { data: reviewerProfiles } = await supabase
      .from('profiles').select('id, full_name, avatar_url').in('id', reviewerIds);

    const profileMap = new Map((reviewerProfiles ?? []).map((p: any) => [p.id, p]));
    const enriched = rawReviews.map((r: any) => ({ ...r, reviewer: profileMap.get(r.reviewer_id) }));

    setReviews(enriched);
    setAvgRating(enriched.reduce((sum: number, r: any) => sum + r.rating, 0) / enriched.length);

    const mine = enriched.find((r: any) => r.reviewer_id === uid);
    if (mine) { setMyReview(mine); setDraftRating(mine.rating); setDraftComment(mine.comment ?? ''); }
  }

  async function toggleLike() {
    if (!profile || liking) return;
    setLiking(true);
    try {
      if (liked) {
        await supabase.from('likes').delete().eq('from_user', currentUserId).eq('to_user', profile.id);
        setLiked(false);
      } else {
        await supabase.from('likes').insert({ from_user: currentUserId, to_user: profile.id });
        setLiked(true);
        const { data: mutual } = await supabase.from('likes').select('id')
          .eq('from_user', profile.id).eq('to_user', currentUserId).maybeSingle();
        if (mutual) {
          Alert.alert('🎉 É um Match!', `Tu e ${profile.full_name} interessam-se mutuamente!`, [
            { text: 'Ver Matches', onPress: () => router.replace('/(tabs)/matches') },
            { text: 'Continuar', style: 'cancel' },
          ]);
        }
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLiking(false);
    }
  }

  async function saveReview() {
    setSavingReview(true);
    try {
      if (myReview) {
        const { error } = await supabase.from('reviews')
          .update({ rating: draftRating, comment: draftComment.trim() })
          .eq('id', myReview.id);
        if (error) { Alert.alert('Erro ao guardar', error.message); return; }
      } else {
        const { error } = await supabase.from('reviews').insert({
          reviewer_id: currentUserId,
          reviewed_id: id,
          rating: draftRating,
          comment: draftComment.trim() || null,
        });
        if (error) { Alert.alert('Erro ao guardar', error.message); return; }
      }
      setShowReviewModal(false);
      await loadReviews(currentUserId);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSavingReview(false);
    }
  }

  async function deleteReview() {
    Alert.alert('Eliminar avaliação', 'Tens a certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await supabase.from('reviews').delete().eq('id', myReview!.id);
        setMyReview(null); setDraftRating(5); setDraftComment('');
        setShowReviewModal(false);
        await loadReviews(currentUserId);
      }},
    ]);
  }

  async function shareProfile() {
    if (!profile) return;
    const typeLabel = profile.user_type === 'professional' ? 'profissional' : 'espaço';
    const cityPart = profile.city ? ` em ${profile.city}` : '';
    const deepLink = `pro://profile-detail?id=${profile.id}`;
    try {
      await Share.share({
        title: `${profile.full_name} — PRO`,
        message: `Vê o perfil de ${profile.full_name}, ${typeLabel}${cityPart}, na PRO!\n\n${deepLink}`,
      });
    } catch (_) {}
  }

  async function submitReport() {
    if (!reportReason) return;
    setSendingReport(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: currentUserId,
        reported_id: id,
        reason: reportReason,
        description: reportDescription.trim() || null,
      });
      if (error) {
        if (error.code === '23505') {
          Alert.alert('Já denunciaste este perfil anteriormente.');
        } else {
          Alert.alert('Erro', error.message);
        }
      } else {
        setShowReportModal(false);
        setReportReason('');
        setReportDescription('');
        Alert.alert('Denúncia enviada', 'Obrigado. Vamos analisar o perfil em breve.');
      }
    } finally {
      setSendingReport(false);
    }
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d < 1) return 'hoje';
    if (d < 30) return `há ${d}d`;
    return `há ${Math.floor(d / 30)}m`;
  }

  if (loading) return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ActivityIndicator color={colors.accent} style={{ marginTop: 80 }} />
    </SafeAreaView>
  );

  if (!profile) return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={{ color: colors.text, textAlign: 'center', marginTop: 80 }}>Perfil não encontrado</Text>
    </SafeAreaView>
  );

  const isPro = profile.user_type === 'professional';
  const isStore = profile.user_type === 'store';
  const photos = profile.portfolio_urls ?? [];
  const isOwn = currentUserId === profile.id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerUsername, { color: colors.text }]}>
          {profile.username ? `@${profile.username}` : profile.full_name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={shareProfile} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          {!isOwn && (
            <TouchableOpacity onPress={() => setShowReportModal(true)} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
              <Ionicons name="flag-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + stats */}
        <View style={styles.profileRow}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={[styles.avatar, { borderColor: colors.accent }]} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.accent }]}>
              <Text style={styles.avatarText}>{profile.full_name?.charAt(0).toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.text }]}>{photos.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSub }]}>fotos</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.text }]}>{reviews.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSub }]}>reviews</Text>
            </View>
            {isPro ? (
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: colors.text }]}>{profile.specialties?.length ?? 0}</Text>
                <Text style={[styles.statLabel, { color: colors.textSub }]}>skills</Text>
              </View>
            ) : (
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: colors.text }]}>{extra?.capacity ?? '—'}</Text>
                <Text style={[styles.statLabel, { color: colors.textSub }]}>cadeiras</Text>
              </View>
            )}
          </View>
        </View>

        {/* Nome + badge + rating */}
        <View style={styles.bioSection}>
          <View style={styles.nameRow}>
            {profile.premium && <Ionicons name="star" size={18} color="#f0a500" />}
            <Text style={[styles.name, { color: colors.text }]}>{profile.full_name}</Text>
            {profile.verified && <Ionicons name="checkmark-circle" size={20} color="#007aff" />}
            <View style={[styles.badge, { backgroundColor: colors.card }]}>
              <Text style={[styles.badgeText, { color: colors.textSub }]}>{isPro ? 'Profissional' : isStore ? 'Loja' : 'Espaço'}</Text>
            </View>
          </View>

          {reviews.length > 0 && (
            <View style={styles.ratingRow}>
              <Stars rating={Math.round(avgRating)} size={14} />
              <Text style={[styles.ratingText, { color: colors.textSub }]}>
                {avgRating.toFixed(1)} · {reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'}
              </Text>
            </View>
          )}

          {profile.city && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.textSub} />
              <Text style={[styles.locationText, { color: colors.textSub }]}>{profile.city}</Text>
            </View>
          )}
          {!isPro && extra?.address && (
            <View style={styles.locationRow}>
              <Ionicons name="map-outline" size={14} color={colors.textSub} />
              <Text style={[styles.locationText, { color: colors.textSub }]}>{extra.address}</Text>
            </View>
          )}
          {profile.bio && <Text style={[styles.bio, { color: colors.textSub }]}>{profile.bio}</Text>}
          {isStore && (
            <View style={{ marginTop: 8, gap: 6 }}>
              {extra?.store_type && (
                <View style={styles.locationRow}>
                  <Ionicons name="storefront-outline" size={14} color={colors.textSub} />
                  <Text style={[styles.locationText, { color: colors.textSub }]}>{extra.store_type}</Text>
                </View>
              )}
              {extra?.website ? (
                <View style={styles.locationRow}>
                  <Ionicons name="globe-outline" size={14} color={colors.accent} />
                  <Text style={[styles.locationText, { color: colors.accent }]}>{extra.website}</Text>
                </View>
              ) : null}
              {extra?.instagram ? (
                <View style={styles.locationRow}>
                  <Ionicons name="logo-instagram" size={14} color={colors.accent} />
                  <Text style={[styles.locationText, { color: colors.accent }]}>@{extra.instagram}</Text>
                </View>
              ) : null}
            </View>
          )}
          {isPro && profile.specialties && profile.specialties.length > 0 && (
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
        </View>

        {/* Botões like + mensagem */}
        {!isOwn && (
          <View style={styles.actionRow}>
            {!isStore && <TouchableOpacity
              style={[styles.likeBtn, liked && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.accent }]}
              onPress={toggleLike} disabled={liking}>
              {!liked && <LinearGradient colors={colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill} />}
              {liking
                ? <ActivityIndicator color={liked ? colors.accent : '#fff'} size="small" />
                : <>
                    <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.accent : '#fff'} />
                    <Text style={[styles.likeBtnText, liked && { color: colors.accent }]}>{liked ? 'Gostei' : 'Like'}</Text>
                  </>}
            </TouchableOpacity>}
            <TouchableOpacity style={[styles.msgBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/conversation', params: { userId: profile.id, name: profile.full_name } })}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
              <Text style={[styles.msgBtnText, { color: colors.text }]}>Mensagem</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Grid de fotos */}
        {photos.length > 0 && (
          <View style={styles.grid}>
            {photos.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.gridPhoto} />
            ))}
          </View>
        )}
        {photos.length === 0 && (
          <View style={styles.emptyPhotos}>
            <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyPhotosText, { color: colors.textMuted }]}>Sem fotos ainda</Text>
          </View>
        )}

        {/* Disponibilidade (só espaços) */}
        {!isPro && Object.keys(availability).length > 0 && (
          <View style={[styles.avSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.avTitle, { color: colors.text }]}>Disponibilidade</Text>
            <View style={styles.avGrid}>
              {[1, 2, 3, 4, 5, 6, 0].map(day => {
                const slot = availability[day];
                return (
                  <View key={day} style={[
                    styles.avCell,
                    { backgroundColor: slot ? colors.accentBg : colors.card, borderColor: slot ? colors.accentBorder : colors.border }
                  ]}>
                    <Text style={[styles.avDay, { color: slot ? colors.accent : colors.textMuted }]}>
                      {DAYS_SHORT[day]}
                    </Text>
                    {slot ? (
                      <Text style={[styles.avTime, { color: colors.accent }]}>{slot.start}{'\n'}{slot.end}</Text>
                    ) : (
                      <Text style={[styles.avClosed, { color: colors.textMuted }]}>—</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Secção de Reviews */}
        <View style={[styles.reviewsSection, { borderTopColor: colors.border }]}>
          <View style={styles.reviewsHeader}>
            <Text style={[styles.reviewsTitle, { color: colors.text }]}>
              Avaliações {reviews.length > 0 ? `(${reviews.length})` : ''}
            </Text>
            {!isOwn && (
              <TouchableOpacity
                style={[styles.addReviewBtn, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}
                onPress={() => setShowReviewModal(true)}>
                <Ionicons name={myReview ? 'pencil' : 'star-outline'} size={14} color={colors.accent} />
                <Text style={[styles.addReviewText, { color: colors.accent }]}>
                  {myReview ? 'Editar' : 'Avaliar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {reviews.length === 0 ? (
            <Text style={[styles.noReviews, { color: colors.textMuted }]}>Sem avaliações ainda.</Text>
          ) : (
            reviews.map(r => (
              <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.reviewTop}>
                  {r.reviewer?.avatar_url ? (
                    <Image source={{ uri: r.reviewer.avatar_url }} style={styles.reviewAvatar} />
                  ) : (
                    <View style={[styles.reviewAvatarFallback, { backgroundColor: colors.accent }]}>
                      <Text style={styles.reviewAvatarText}>{r.reviewer?.full_name?.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reviewName, { color: colors.text }]}>{r.reviewer?.full_name ?? 'Utilizador'}</Text>
                    <View style={styles.reviewMeta}>
                      <Stars rating={r.rating} size={12} />
                      <Text style={[styles.reviewTime, { color: colors.textMuted }]}> · {timeAgo(r.created_at)}</Text>
                    </View>
                  </View>
                </View>
                {r.comment ? <Text style={[styles.reviewComment, { color: colors.textSub }]}>{r.comment}</Text> : null}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de denúncia */}
      <Modal visible={showReportModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowReportModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSub }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Denunciar perfil</Text>
            <TouchableOpacity onPress={submitReport} disabled={!reportReason || sendingReport}>
              {sendingReport
                ? <ActivityIndicator size="small" color={colors.accent} />
                : <Text style={[styles.modalSave, { color: reportReason ? '#e94560' : colors.textMuted }]}>Enviar</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.modalLabel, { color: colors.textSub }]}>Motivo *</Text>
            {[
              'Conteúdo inapropriado',
              'Perfil falso ou spam',
              'Comportamento abusivo',
              'Informações enganosas',
              'Outro',
            ].map(reason => (
              <TouchableOpacity
                key={reason}
                style={[styles.reasonRow, { borderColor: colors.border, backgroundColor: reportReason === reason ? colors.accentBg : colors.card }]}
                onPress={() => setReportReason(reason)}>
                <Text style={[styles.reasonText, { color: reportReason === reason ? colors.accent : colors.text }]}>{reason}</Text>
                {reportReason === reason && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
              </TouchableOpacity>
            ))}
            <Text style={[styles.modalLabel, { color: colors.textSub, marginTop: 16 }]}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              multiline numberOfLines={4}
              placeholder="Descreve o problema..."
              placeholderTextColor={colors.textMuted}
              value={reportDescription}
              onChangeText={setReportDescription}
              maxLength={500}
            />
            <Text style={[styles.reportDisclaimer, { color: colors.textMuted }]}>
              As denúncias são anónimas e serão analisadas pela nossa equipa.
            </Text>
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Modal de review */}
      <Modal visible={showReviewModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowReviewModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSub }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {myReview ? 'Editar avaliação' : 'Avaliar'}
            </Text>
            <TouchableOpacity onPress={saveReview} disabled={savingReview}>
              {savingReview
                ? <ActivityIndicator size="small" color={colors.accent} />
                : <Text style={[styles.modalSave, { color: colors.accent }]}>Guardar</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.modalProfileName, { color: colors.text }]}>{profile?.full_name}</Text>

            <Text style={[styles.modalLabel, { color: colors.textSub }]}>Classificação</Text>
            <Stars rating={draftRating} size={40} onPress={setDraftRating} />

            <Text style={[styles.modalLabel, { color: colors.textSub }]}>Comentário (opcional)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              multiline
              numberOfLines={5}
              placeholder="Descreve a tua experiência..."
              placeholderTextColor={colors.textMuted}
              value={draftComment}
              onChangeText={setDraftComment}
              maxLength={500}
            />

            {myReview && (
              <TouchableOpacity style={styles.deleteReviewBtn} onPress={deleteReview}>
                <Ionicons name="trash-outline" size={16} color={colors.accent} />
                <Text style={[styles.deleteReviewText, { color: colors.accent }]}>Eliminar avaliação</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerUsername: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' },
  name: { fontSize: 17, fontWeight: '700' },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  ratingText: { fontSize: 13 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  locationText: { fontSize: 13 },
  bio: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  chipsRow: { flexDirection: 'row', gap: 6 },
  chip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, gap: 10 },
  likeBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 4 },
  likeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  msgBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  msgBtnText: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginBottom: 2 },
  emptyPhotos: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  emptyPhotosText: { fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1.5 },
  gridPhoto: { width: PHOTO_SIZE, height: PHOTO_SIZE },
  // Disponibilidade
  avSection: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, borderTopWidth: 1, marginTop: 8 },
  avTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  avGrid: { flexDirection: 'row', gap: 6 },
  avCell: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, gap: 4 },
  avDay: { fontSize: 11, fontWeight: '700' },
  avTime: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
  avClosed: { fontSize: 14 },
  // Reviews
  reviewsSection: { paddingHorizontal: 16, paddingTop: 20, borderTopWidth: 1, marginTop: 8 },
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  reviewsTitle: { fontSize: 17, fontWeight: '700' },
  addReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  addReviewText: { fontSize: 13, fontWeight: '600' },
  noReviews: { fontSize: 14, paddingVertical: 20, textAlign: 'center' },
  reviewCard: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewAvatarFallback: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  reviewName: { fontWeight: '600', fontSize: 14 },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  reviewTime: { fontSize: 12 },
  reviewComment: { fontSize: 14, lineHeight: 20 },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalSave: { fontSize: 15, fontWeight: '700' },
  modalBody: { padding: 24, gap: 16 },
  modalProfileName: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  modalLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { borderRadius: 14, padding: 16, fontSize: 15, borderWidth: 1, textAlignVertical: 'top', minHeight: 120 },
  deleteReviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, padding: 14 },
  deleteReviewText: { color: '#e94560', fontSize: 15, fontWeight: '600' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 8 },
  reasonText: { fontSize: 15, fontWeight: '500' },
  reportDisclaimer: { fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 },
});
