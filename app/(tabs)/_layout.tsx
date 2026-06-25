import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import { useNotifications } from '@/lib/NotificationContext';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { unreadMatches, unreadMessages, markMatchesSeen, refresh } = useNotifications();
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setUserType('professional'); return; }
      supabase.from('profiles').select('user_type').eq('id', session.user.id).single()
        .then(({ data }) => { setUserType(data?.user_type ?? 'professional'); });
    });
  }, []);

  if (userType === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const isStore = userType === 'store';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '600', letterSpacing: -0.2 },
        tabBarIconStyle: { marginBottom: -2 },
        tabBarItemStyle: { paddingHorizontal: 0 },
      }}>
      <Tabs.Screen
        name="feed"
        options={{
          title: t('tabs.feed'),
          tabBarIcon: ({ color, size }) => <Ionicons name="reorder-four-outline" size={size + 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: isStore ? null : undefined,
          title: t('tabs.discover'),
          tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          href: isStore ? null : undefined,
          title: t('tabs.marketplace'),
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          href: isStore ? null : undefined,
          title: t('tabs.map'),
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        listeners={{ focus: () => { markMatchesSeen(); refresh(); } }}
        options={{
          href: isStore ? null : undefined,
          title: t('tabs.interactions'),
          tabBarBadge: unreadMatches > 0 ? unreadMatches : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, fontSize: 10 },
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        listeners={{ focus: () => refresh() }}
        options={{
          title: t('tabs.chat'),
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, fontSize: 10 },
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
