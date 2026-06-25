import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const LAST_SEEN_MATCHES_KEY = 'pro_lastSeenMatches';

type NotificationContextType = {
  unreadMatches: number;
  unreadMessages: number;
  markMatchesSeen: () => void;
  refresh: () => void;
};

const NotificationContext = createContext<NotificationContextType>({
  unreadMatches: 0,
  unreadMessages: 0,
  markMatchesSeen: () => {},
  refresh: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadMatches, setUnreadMatches] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;

    // Unread matches — novos desde a última vez que abriu o tab
    const lastSeen = await AsyncStorage.getItem(LAST_SEEN_MATCHES_KEY);
    const { data: newMatches } = await supabase
      .from('matches')
      .select('id', { count: 'exact' })
      .or(`user1.eq.${uid},user2.eq.${uid}`)
      .gt('created_at', lastSeen ?? '1970-01-01');
    setUnreadMatches(newMatches?.length ?? 0);

    // Unread messages
    const { data: unreadMsgs } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('to_user', uid)
      .eq('read', false);
    setUnreadMessages(unreadMsgs?.length ?? 0);
  }, []);

  async function markMatchesSeen() {
    await AsyncStorage.setItem(LAST_SEEN_MATCHES_KEY, new Date().toISOString());
    setUnreadMatches(0);
  }

  useEffect(() => {
    refresh();
    // Refresh a cada 30 segundos
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadMatches, unreadMessages, markMatchesSeen, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
