import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

type Message = {
  id: string;
  from_user: string;
  to_user: string;
  content: string;
  created_at: string;
  read: boolean;
};

export default function ConversationScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { userId, name } = useLocalSearchParams<{ userId: string; name: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUserId(session.user.id);

      const { data: prof } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
      setOtherAvatar(prof?.avatar_url ?? null);

      await loadMessages(session.user.id);
      markAsRead(session.user.id);

      channel = supabase
        .channel(`conv-${session.user.id}-${userId}-${Date.now()}`)
        .on('postgres_changes' as any, {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `to_user=eq.${session.user.id}`,
        }, (payload: any) => {
          const msg = payload.new as Message;
          if (msg.from_user === userId) {
            setMessages(prev => [...prev, msg]);
            supabase.from('messages').update({ read: true }).eq('id', msg.id);
            setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
          }
        })
        .subscribe();
    }

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadMessages(uid: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(from_user.eq.${uid},to_user.eq.${userId}),and(from_user.eq.${userId},to_user.eq.${uid})`)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    setLoading(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  }

  async function markAsRead(uid: string) {
    await supabase.from('messages')
      .update({ read: true })
      .eq('from_user', userId)
      .eq('to_user', uid)
      .eq('read', false);
  }

  async function send() {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      const { data, error } = await supabase.from('messages').insert({
        from_user: currentUserId,
        to_user: userId,
        content,
      }).select().single();
      if (!error && data) {
        setMessages(prev => [...prev, data]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return t('chat.today');
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
    return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
  }

  const grouped = messages.reduce((acc, msg, i) => {
    const dateKey = new Date(msg.created_at).toDateString();
    const prev = messages[i - 1];
    const prevKey = prev ? new Date(prev.created_at).toDateString() : null;
    if (dateKey !== prevKey) acc.push({ type: 'date', key: dateKey, label: formatDate(msg.created_at) });
    acc.push({ type: 'msg', ...msg });
    return acc;
  }, [] as any[]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerProfile}
          onPress={() => router.push({ pathname: '/profile-detail', params: { id: userId } })}>
          {otherAvatar ? (
            <Image source={{ uri: otherAvatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatarFallback, { backgroundColor: colors.accent }]}>
              <Text style={styles.headerAvatarText}>{name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={[styles.headerName, { color: colors.text }]}>{name}</Text>
        </TouchableOpacity>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            ref={flatRef}
            data={grouped}
            keyExtractor={(item, i) => item.id ?? item.key ?? String(i)}
            contentContainerStyle={{ padding: 16, gap: 4 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              if (item.type === 'date') return (
                <View style={styles.dateSeparator}>
                  <Text style={[styles.dateLabel, { backgroundColor: colors.card, color: colors.textMuted }]}>{item.label}</Text>
                </View>
              );
              const isMine = item.from_user === currentUserId;
              return (
                <View style={[styles.bubble, isMine ? styles.bubbleMine : [styles.bubbleOther, { backgroundColor: colors.bubble }]]}>
                  {isMine && <LinearGradient colors={colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:0}} style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} />}
                  <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : { color: colors.text }]}>
                    {item.content}
                  </Text>
                  <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : { color: colors.textMuted }]}>
                    {formatTime(item.created_at)}
                    {isMine && <Text> {item.read ? ' ✓✓' : ' ✓'}</Text>}
                  </Text>
                </View>
              );
            }}
          />
        )}

        {/* Input */}
        <View style={[styles.inputRow, { borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={input}
            onChangeText={setInput}
            placeholder={t('chat.writeMessage')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            onSubmitEditing={send}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!input.trim() || sending}>
            <LinearGradient colors={(!input.trim() || sending) ? ['#999','#999'] : colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerProfile: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e94560', alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  headerName: { fontSize: 16, fontWeight: '700' },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateLabel: { fontSize: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, marginVertical: 2 },
  bubbleMine: { alignSelf: 'flex-end', borderBottomRightRadius: 4, overflow: 'hidden' },
  bubbleOther: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
  bubbleTime: { fontSize: 10, marginTop: 3 },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120, borderWidth: 1 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 4 },
  sendBtnDisabled: { opacity: 0.5 },
});
