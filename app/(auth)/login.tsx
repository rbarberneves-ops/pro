import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View, StatusBar, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { GradientButton } from '@/lib/animated';
import { useTheme } from '@/lib/ThemeContext';
import { useTranslation } from 'react-i18next';

const VIDEO_SOURCES = [
  require('../../assets/images/intro.mp4'),
  require('../../assets/images/intro2.mp4'),
  require('../../assets/images/intro3.mp4'),
];

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);

  const videoOpacities = useRef([
    new Animated.Value(1),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;


  useEffect(() => {
    const interval = setInterval(() => {
      setVideoIndex(prev => {
        const next = (prev + 1) % 3;
        videoOpacities.forEach((anim, i) => {
          Animated.timing(anim, {
            toValue: i === next ? 1 : 0,
            duration: 800,
            useNativeDriver: true,
          }).start();
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Erro', error.message);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: videoOpacities[0] }]}>
        <Video source={VIDEO_SOURCES[0]} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted useNativeControls={false} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: videoOpacities[1] }]}>
        <Video source={VIDEO_SOURCES[1]} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted useNativeControls={false} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: videoOpacities[2] }]}>
        <Video source={VIDEO_SOURCES[2]} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted useNativeControls={false} />
      </Animated.View>

      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}>

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← {t('common.back')}</Text>
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.accent }]}>PRO</Text>
          <Text style={styles.entrar}>{t('auth.login.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t('auth.login.email')}
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth.login.password')}
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <GradientButton
            onPress={signIn}
            disabled={loading}
            gradientColors={['#e94560', '#c73652']}
            style={styles.buttonOuter}
            innerStyle={styles.buttonInner}>
            <Text style={styles.buttonText}>{loading ? t('auth.login.loading') : t('auth.login.loginBtn')}</Text>
          </GradientButton>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.link}>
              {t('auth.login.noAccount')} <Text style={styles.linkBold}>{t('auth.login.createAccount')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40 },
  back: { marginBottom: 32 },
  backText: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  titleBlock: { marginBottom: 40 },
  title: { fontSize: 36, fontFamily: 'Orbitron_900Black', letterSpacing: 2, marginBottom: 8 },
  entrar: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.65)' },
  form: { gap: 14 },
  input: {
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
  },
  buttonOuter: { marginTop: 8 },
  buttonInner: { paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  link: { textAlign: 'center', fontSize: 15, marginTop: 8, color: 'rgba(255,255,255,0.55)' },
  linkBold: { fontWeight: '700', color: '#e94560' },
});
