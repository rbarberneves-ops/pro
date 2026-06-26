import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Image, Dimensions,
  Modal, TextInput, Alert, ScrollView, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { FadeInView, useLikeAnimation, AnimatedPressable } from '@/lib/animated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

// POST_TYPE_LABELS is now built dynamically inside the component using t()

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  post_type: string;
  likes_count: number;
  created_at: string;
  profile?: { full_name: string; avatar_url?: string; user_type: string; verified?: boolean; premium?: boolean };
  liked?: boolean;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}


import { Linking } from 'react-native';

function AdBanner({ ad, colors, sponsored }: { ad: any; colors: any; sponsored: string }) {
  async function handleClick() {
    await supabase.from('store_ads').update({ clicks: supabase.rpc('increment', { x: 1 }) }).eq('id', ad.id);
    if (ad.cta_link) Linking.openURL(ad.cta_link).catch(() => {});
  }
  return (
    <TouchableOpacity
      onPress={handleClick}
      activeOpacity={0.92}
      style={[styles.adCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.adBadge}>
        <Ionicons name="megaphone-outline" size={10} color={colors.textMuted} />
        <Text style={[styles.adBadgeText, { color: colors.textMuted }]}>{sponsored}</Text>
      </View>
      {ad.image_url && (
        <Image source={{ uri: ad.image_url }} style={styles.adImage} resizeMode="cover" />
      )}
      <View style={styles.adContent}>
        <Text style={[styles.adTitle, { color: colors.text }]}>{ad.title}</Text>
        {ad.subtitle && <Text style={[styles.adSubtitle, { color: colors.textSub }]}>{ad.subtitle}</Text>}
        {ad.cta_text && (
          <View style={[styles.adCta, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
            <Text style={[styles.adCtaText, { color: colors.accent }]}>{ad.cta_text}</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.accent} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function LikeButton({ item, colors, onPress }: { item: Post; colors: any; onPress: () => void }) {
  const { scale, bounce } = useLikeAnimation();
  function handlePress() {
    bounce();
    onPress();
  }
  return (
    <TouchableOpacity style={styles.postAction} onPress={handlePress}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={item.liked ? 'heart' : 'heart-outline'} size={20} color={item.liked ? colors.accent : colors.textSub} />
      </Animated.View>
      <Text style={[styles.postActionText, { color: item.liked ? colors.accent : colors.textSub }]}>{item.likes_count}</Text>
    </TouchableOpacity>
  );
}

type Ad = {
  id: string;
  store_id: string;
  image_url?: string;
  title: string;
  subtitle?: string;
  cta_text: string;
  cta_link?: string;
  _isAd: true;
};

type FeedItem = Post | Ad;

export default function FeedScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const POST_TYPE_LABELS: Record<string, string> = {
    general: t('feed.typeGeneral'),
    job: t('feed.typeJob'),
    event: t('feed.typeEvent'),
    portfolio: t('feed.typePortfolio'),
    ad: t('feed.typeAd'),
  };
  const [posts, setPosts] = useState<Post[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');

  // Edit modal
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setCurrentUserId(session.user.id);
    await Promise.all([fetchPosts(session.user.id), fetchAds()]);
  }

  async function fetchAds() {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('store_ads')
      .select('id, store_id, image_url, title, subtitle, cta_text, cta_link')
      .eq('active', true)
      .lte('starts_at', now)
      .gte('ends_at', now)
      .limit(5);
    if (data) setAds(data.map((a: any) => ({ ...a, _isAd: true as const })));
  }

  async function fetchPosts(uid: string) {
    setLoading(true);
    const { data: rawPosts } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (rawPosts && rawPosts.length > 0) {
      const authorIds = [...new Set(rawPosts.map((p: any) => p.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, user_type, verified, premium')
        .in('id', authorIds);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      const { data: postLikes } = await supabase
        .from('post_likes').select('post_id').eq('user_id', uid);
      const likedPostIds = new Set((postLikes ?? []).map((l: any) => l.post_id));

      setPosts(rawPosts.map((p: any) => ({
        ...p,
        profile: profileMap.get(p.user_id),
        liked: likedPostIds.has(p.id),
      })));
    } else {
      setPosts([]);
    }
    setLoading(false);
  }

  async function togglePostLike(post: Post) {
    const newLiked = !post.liked;
    setPosts(prev => prev.map(p => p.id === post.id
      ? { ...p, liked: newLiked, likes_count: p.likes_count + (newLiked ? 1 : -1) }
      : p));
    if (newLiked) {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUserId });
      await supabase.from('posts').update({ likes_count: post.likes_count + 1 }).eq('id', post.id);
    } else {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUserId);
      await supabase.from('posts').update({ likes_count: post.likes_count - 1 }).eq('id', post.id);
    }
  }

  function openEdit(post: Post) {
    setEditingPost(post);
    setEditContent(post.content);
    setEditImageUrl(post.image_url ?? null);
  }

  async function pickEditImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(t('feed.permissionRequired')); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.7, base64: true,
    });
    if (result.canceled) return;
    setUploadingEditImage(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, decode(asset.base64!), {
        contentType: `image/${ext}`, upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setEditImageUrl(data.publicUrl);
    } catch (e: any) {
      Alert.alert('Erro no upload', e.message);
    } finally {
      setUploadingEditImage(false);
    }
  }

  async function saveEdit() {
    if (!editingPost) return;
    setSaving(true);
    try {
      // Obter userId directamente da sessão — não depender do state
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent.trim(), image_url: editImageUrl })
        .eq('id', editingPost.id)
        .eq('user_id', session.user.id);
      if (error) {
        Alert.alert('Erro', error.message);
      } else {
        setPosts(prev => prev.map(p =>
          p.id === editingPost.id
            ? { ...p, content: editContent.trim(), image_url: editImageUrl ?? undefined }
            : p
        ));
        setEditingPost(null);
      }
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(post: Post) {
    Alert.alert(t('feed.deletePost'), t('feed.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive', onPress: async () => {
          await supabase.from('posts').delete().eq('id', post.id).eq('user_id', currentUserId);
          setPosts(prev => prev.filter(p => p.id !== post.id));
          setEditingPost(null);
        }
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.logo, { color: colors.text }]}>PRO</Text>
        <View style={styles.headerActions}>
          <AnimatedPressable onPress={() => router.push('/new-post')} style={styles.headerBtn}>
            <LinearGradient
              colors={colors.accentGradient as [string, string]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 19 }]} />
            <Ionicons name="add" size={22} color="#fff" />
          </AnimatedPressable>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={[styles.headerBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="person-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : posts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="newspaper-outline" size={56} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('feed.noPostsYet')}</Text>
          <Text style={[styles.emptySubText, { color: colors.textSub }]}>{t('feed.beFirst')}</Text>
          <TouchableOpacity style={[styles.newPostCta, { backgroundColor: colors.accent }]} onPress={() => router.push('/new-post')}>
            <Text style={styles.newPostCtaText}>+ {t('feed.newPost')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={(() => {
            const mixed: FeedItem[] = [];
            posts.forEach((p, i) => {
              mixed.push(p);
              if (ads.length > 0 && (i + 1) % 5 === 0) {
                mixed.push(ads[(i / 5) % ads.length]);
              }
            });
            return mixed;
          })()}
          keyExtractor={item => ('_isAd' in item ? `ad-${item.id}-${Math.random()}` : item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item, index }) => {
            if ('_isAd' in item) return <AdBanner ad={item} colors={colors} sponsored={t('feed.sponsored')} />;
            return (
            <FadeInView delay={index * 60} style={[styles.postCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.postHeader}
                onPress={() => router.push({ pathname: '/profile-detail', params: { id: item.user_id } })}>
                {item.profile?.avatar_url ? (
                  <Image source={{ uri: item.profile.avatar_url }} style={styles.postAvatar} />
                ) : (
                  <View style={[styles.postAvatarFallback, { backgroundColor: colors.accent }]}>
                    <Text style={styles.postAvatarText}>{item.profile?.full_name?.charAt(0).toUpperCase() ?? '?'}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {item.profile?.premium && <Ionicons name="star" size={13} color="#f0a500" />}
                    <Text style={[styles.postAuthor, { color: colors.text }]}>{item.profile?.full_name ?? t('feed.user')}</Text>
                    {item.profile?.verified && <Ionicons name="checkmark-circle" size={15} color="#007aff" />}
                  </View>
                  <View style={styles.postMeta}>
                    <Text style={[styles.postType, { color: colors.textSub }]}>{POST_TYPE_LABELS[item.post_type] ?? item.post_type}</Text>
                    <Text style={[styles.postTime, { color: colors.textMuted }]}> · {timeAgo(item.created_at)}</Text>
                  </View>
                </View>
                {/* Botão editar — só para o autor */}
                {item.user_id === currentUserId && (
                  <TouchableOpacity onPress={() => openEdit(item)} style={styles.moreBtn}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {item.content ? <Text style={[styles.postContent, { color: colors.text }]}>{item.content}</Text> : null}
              {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.postImage} resizeMode="cover" /> : null}

              <View style={[styles.postActions, { borderTopColor: colors.border }]}>
                <LikeButton item={item} colors={colors} onPress={() => togglePostLike(item)} />
                <TouchableOpacity
                  style={styles.postAction}
                  onPress={() => router.push({ pathname: '/conversation', params: { userId: item.user_id, name: item.profile?.full_name ?? '' } })}>
                  <Ionicons name="chatbubble-outline" size={20} color={colors.textSub} />
                  <Text style={[styles.postActionText, { color: colors.textSub }]}>{t('feed.message')}</Text>
                </TouchableOpacity>
              </View>
            </FadeInView>
            );
          }}
        />
      )}

      {/* Modal de edição */}
      <Modal visible={!!editingPost} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingPost(null)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setEditingPost(null)}>
              <Text style={[styles.modalCancel, { color: colors.textSub }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('feed.editPost')}</Text>
            <TouchableOpacity onPress={saveEdit} disabled={saving || !editContent.trim()}>
              {saving
                ? <ActivityIndicator size="small" color={colors.accent} />
                : <Text style={[styles.modalSave, { color: editContent.trim() ? colors.accent : colors.textMuted }]}>{t('common.save')}</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              placeholder={t('feed.writeHere')}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            {/* Imagem editável */}
            {editImageUrl ? (
              <View style={styles.modalImageWrap}>
                <Image source={{ uri: editImageUrl }} style={styles.modalImage} resizeMode="cover" />
                <View style={styles.modalImageActions}>
                  <TouchableOpacity style={[styles.imgActionBtn, { backgroundColor: colors.card }]} onPress={pickEditImage} disabled={uploadingEditImage}>
                    {uploadingEditImage
                      ? <ActivityIndicator size="small" color={colors.accent} />
                      : <><Ionicons name="image-outline" size={16} color={colors.text} /><Text style={[styles.imgActionText, { color: colors.text }]}>{t('feed.change')}</Text></>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.imgActionBtn, { backgroundColor: colors.card }]} onPress={() => setEditImageUrl(null)}>
                    <Ionicons name="trash-outline" size={16} color="#e94560" />
                    <Text style={[styles.imgActionText, { color: '#e94560' }]}>{t('feed.remove')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={[styles.addImageBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickEditImage} disabled={uploadingEditImage}>
                {uploadingEditImage
                  ? <ActivityIndicator color={colors.accent} />
                  : <><Ionicons name="image-outline" size={22} color={colors.textMuted} /><Text style={[styles.addImageText, { color: colors.textMuted }]}>{t('feed.addImage')}</Text></>}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: colors.border }]}
              onPress={() => editingPost && confirmDelete(editingPost)}>
              <Ionicons name="trash-outline" size={18} color="#e94560" />
              <Text style={styles.deleteBtnText}>{t('feed.deletePost')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  logo: { fontSize: 22, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubText: { fontSize: 14, textAlign: 'center' },
  newPostCta: { marginTop: 8, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  newPostCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  postCard: { marginBottom: 8, borderTopWidth: 1, borderBottomWidth: 1 },
  adCard: { marginHorizontal: 16, marginVertical: 8, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  adBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  adBadgeText: { fontSize: 11, fontWeight: '600' },
  adImage: { width: '100%', aspectRatio: 16/9 },
  adContent: { padding: 12, gap: 6 },
  adTitle: { fontSize: 15, fontWeight: '800' },
  adSubtitle: { fontSize: 13, lineHeight: 18 },
  adCta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
  adCtaText: { fontSize: 13, fontWeight: '700' },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  postAvatar: { width: 42, height: 42, borderRadius: 21 },
  postAvatarFallback: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  postAvatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  postAuthor: { fontWeight: '700', fontSize: 15 },
  postMeta: { flexDirection: 'row', alignItems: 'center' },
  postType: { fontSize: 12 },
  postTime: { fontSize: 12 },
  postContent: { fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 12 },
  postImage: { width: '100%', aspectRatio: 4 / 3 },
  postActions: { flexDirection: 'row', gap: 20, padding: 12, paddingHorizontal: 14, borderTopWidth: 1 },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postActionText: { fontSize: 14 },
  moreBtn: { padding: 4 },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalSave: { fontSize: 15, fontWeight: '700' },
  modalBody: { padding: 16, gap: 16 },
  modalInput: { borderRadius: 14, padding: 16, fontSize: 15, borderWidth: 1, minHeight: 140, textAlignVertical: 'top' },
  modalImageWrap: { gap: 8 },
  modalImage: { width: '100%', height: 200, borderRadius: 12 },
  modalImageActions: { flexDirection: 'row', gap: 8 },
  imgActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 10 },
  imgActionText: { fontSize: 14, fontWeight: '600' },
  addImageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 18 },
  addImageText: { fontSize: 14 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  deleteBtnText: { color: '#e94560', fontSize: 15, fontWeight: '600' },
});
