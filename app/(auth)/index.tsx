import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View, StatusBar, Animated, Modal } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage, getStoredLanguage } from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VIDEO_SOURCES = [
  require('../../assets/images/intro.mp4'),
  require('../../assets/images/intro2.mp4'),
  require('../../assets/images/intro3.mp4'),
];

const TAGLINES = [
  'Conecta profissionais e espaços de beleza.',
  'Onde a fusão entre profissionais e espaços acontece.',
  'Talento encontra espaço. Sempre.',
];

// Cada frase corresponde a um vídeo
const TAG_VIDEO = [0, 1, 2];

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [selectedLang, setSelectedLang] = useState(i18n.language ?? 'pt');

  useEffect(() => {
    getStoredLanguage().then(stored => {
      if (!stored) setShowLangPicker(true);
    });
  }, []);

  async function selectLanguage(code: string) {
    setSelectedLang(code);
    await changeLanguage(code);
    setShowLangPicker(false);
  }
  const [tagIndex, setTagIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);

  const textOpacity = useRef(new Animated.Value(1)).current;
  const videoOpacities = useRef([
    new Animated.Value(1),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;


  useEffect(() => {
    const interval = setInterval(() => {
      const nextTag = (tagIndex + 1) % TAGLINES.length;
      const nextVideo = TAG_VIDEO[nextTag];

      Animated.timing(textOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setTagIndex(nextTag);
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });

      if (nextVideo !== videoIndex) {
        setVideoIndex(nextVideo);
        videoOpacities.forEach((anim, i) => {
          Animated.timing(anim, {
            toValue: i === nextVideo ? 1 : 0,
            duration: 800,
            useNativeDriver: true,
          }).start();
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [tagIndex, videoIndex]);

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

      {/* Overlay escuro */}
      <LinearGradient
        colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']}
        style={StyleSheet.absoluteFill}
      />

      {/* Modal seletor de língua */}
      <Modal visible={showLangPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('auth.language.title')}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSub }]}>{t('auth.language.subtitle')}</Text>
            <View style={styles.langList}>
              {LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langItem, { borderColor: colors.border }, selectedLang === lang.code && { borderColor: colors.accent, backgroundColor: colors.accentBg }]}
                  onPress={() => selectLanguage(lang.code)}>
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <Text style={[styles.langLabel, { color: colors.text }, selectedLang === lang.code && { color: colors.accent, fontWeight: '700' }]}>{lang.label}</Text>
                  {selectedLang === lang.code && <Text style={{ color: colors.accent, fontSize: 16 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.langConfirm, { backgroundColor: colors.accent }]}
              onPress={() => selectLanguage(selectedLang)}>
              <Text style={styles.langConfirmText}>{t('auth.language.select')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.logoContainer}>
        <Text style={[styles.appName, { color: colors.accent }]}>PRO</Text>
        <Animated.Text style={[styles.tagline, { opacity: textOpacity }]}>
          {t(`auth.welcome.tagline${(tagIndex % 3) + 1}`)}
        </Animated.Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.primaryButtonText}>{t('auth.welcome.createAccount')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.secondaryButtonText}>{t('auth.welcome.login')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingVertical: 80, paddingHorizontal: 32, backgroundColor: '#000' },
  logoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appName: { fontSize: 48, fontFamily: 'Orbitron_900Black', letterSpacing: 2 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },
  buttonsContainer: { gap: 12 },
  primaryButton: { backgroundColor: '#e94560', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  secondaryButton: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  secondaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  // Modal língua
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBox: { borderRadius: 20, padding: 24, width: '100%', gap: 16 },
  modalTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginTop: -8 },
  langList: { gap: 10 },
  langItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  langFlag: { fontSize: 28 },
  langLabel: { flex: 1, fontSize: 16 },
  langConfirm: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  langConfirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
