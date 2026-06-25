import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Image, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

type Conversation = {
  userId: string;
  full_name: string;
  avatar_url?: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  verified?: boolean;
  premium?: boolean;
};

export default function ChatScreen() {
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  async function load() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const uid = session.user.id;

    const { data: msgs } = await supabase
      .from('messages')
      .select('id, from_user, to_user, content, read, created_at')
      .or(`from_user.eq.${uid},to_user.eq.${uid}`)
      .order('created_at', { ascending: false });

    if (!msgs || msgs.length === 0) { setConversations([]); setLoading(false); return; }

    const convMap = new Map<string, any>();
    for (const m of msgs) {
      const otherId = m.from_user === uid ? m.to_user : m.from_user;
      if (!convMap.has(otherId)) {
        convMap.set(otherId, {
          userId: otherId,
          lastMessage: m.content,
          lastAt: m.created_at,
          unread: (!m.read && m.to_user === uid) ? 1 : 0,
        });
      } else if (!m.read && m.to_user === uid) {
        convMap.get(otherId).unread += 1;
      }
    }

    const ids = Array.from(convMap.keys());
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, verified, premium')
      .in('id', ids);

    const result: Conversation[] = ids.map(id => {
      const prof = profiles?.find(p => p.id === id);
      return {
        ...convMap.get(id),
        full_name: prof?.full_name ?? 'Utilizador',
        avatar_url: prof?.avatar_url,
        verified: prof?.verified ?? false,
        premium: prof?.premium ?? false,
      };
    });

    setConversations(result);
    setLoading(false);
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Chat</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sem mensagens</Text>
          <Text style={[styles.emptyText, { color: colors.textSub }]}>Podes contactar qualquer profissional ou espaço directamente, mesmo sem match.</Text>
          <TouchableOpacity style={styles.discoverBtn} onPress={() => router.push('/(tabs)')}>
            <LinearGradient colors={colors.accentGradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill} />
            <Text style={styles.discoverBtnText}>Descobrir perfis</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.userId}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => router.push({ pathname: '/conversation', params: { userId: item.userId, name: item.full_name } })}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{item.full_name?.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.rowInfo}>
                <View style={styles.rowTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {item.premium && <Ionicons name="star" size={13} color="#f0a500" />}
                    <Text style={[styles.rowName, { color: colors.text }]}>{item.full_name}</Text>
                    {item.verified && <Ionicons name="checkmark-circle" size={15} color="#007aff" />}
                  </View>
                  <Text style={[styles.rowTime, { color: colors.textMuted }]}>{timeAgo(item.lastAt)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={[styles.rowLast, { color: colors.textSub }]} numberOfLines={1}>{item.lastMessage}</Text>
                  {item.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  discoverBtn: { marginTop: 8, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 6 },
  discoverBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarFallback: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#e94560', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  rowInfo: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rowName: { fontSize: 16, fontWeight: '700' },
  rowTime: { fontSize: 12 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLast: { fontSize: 14, flex: 1 },
  unreadBadge: { backgroundColor: '#e94560', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, marginLeft: 8 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
