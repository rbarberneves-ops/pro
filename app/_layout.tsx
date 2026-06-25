import { supabase } from '@/lib/supabase';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { NotificationProvider } from '@/lib/NotificationContext';
import { Session } from '@supabase/supabase-js';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { initI18n } from '@/lib/i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerPushToken() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    // getExpoPushTokenAsync requer projectId (EAS) — ignorar silenciosamente em Expo Go sem EAS
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('profiles').update({ push_token: token }).eq('id', session.user.id);
    }
  } catch {
    // Push token não disponível sem EAS projectId — badges in-app continuam a funcionar
  }
}

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        router.replace('/(auth)');
      } else {
        registerPushToken();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (session) {
        AsyncStorage.getItem('pro_onboarding_done').then(done => {
          if (done) {
            router.replace('/(tabs)');
          } else {
            router.replace('/onboarding');
          }
        });
      } else {
        router.replace('/(auth)');
      }
    }
  }, [session, loading]);

  const { colors } = useTheme();
  return (
    <>
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
        animationDuration: 280,
      }}>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="profile-detail" options={{ headerShown: false, animation: 'slide_from_right', animationDuration: 260 }} />
        <Stack.Screen name="conversation" options={{ headerShown: false, animation: 'slide_from_right', animationDuration: 260 }} />
        <Stack.Screen name="new-post" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="premium" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="terms" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="privacy" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="new-listing" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="listing-detail" options={{ headerShown: false, animation: 'slide_from_right', animationDuration: 260 }} />
        <Stack.Screen name="create-ad" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
      </Stack>
      <StatusBar style={colors.statusBar} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Orbitron_700Bold, Orbitron_900Black });
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  if (!fontsLoaded || !i18nReady) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}