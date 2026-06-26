import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video, ResizeMode } from 'expo-av';

const videoSource = require('../assets/images/intro.mp4');

const SLIDES = [
  {
    icon: 'star' as const,
    overlay: ['rgba(26,26,46,0.55)', 'rgba(15,52,96,0.75)'] as [string, string],
    title: 'Bem-vindo ao PRO',
    subtitle: 'A plataforma que conecta profissionais de beleza com os melhores espaços.',
  },
  {
    icon: 'person' as const,
    overlay: ['rgba(15,52,96,0.55)', 'rgba(233,69,96,0.75)'] as [string, string],
    title: 'Para Profissionais',
    subtitle: 'Encontra espaços disponíveis perto de ti, mostra o teu portfolio e cresce a tua clientela.',
  },
  {
    icon: 'storefront' as const,
    overlay: ['rgba(26,26,46,0.55)', 'rgba(83,52,131,0.75)'] as [string, string],
    title: 'Para Espaços',
    subtitle: 'Define a tua disponibilidade, atrai profissionais de qualidade e maximiza o uso do teu espaço.',
  },
  {
    icon: 'rocket' as const,
    overlay: ['rgba(15,52,96,0.55)', 'rgba(26,26,46,0.85)'] as [string, string],
    title: 'Tudo num só lugar',
    subtitle: 'Feed, Mapa, Chat e muito mais. Começa agora e descobre o potencial do PRO.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slide = SLIDES[currentIndex];

  async function finish() {
    await AsyncStorage.setItem('pro_onboarding_done', 'true');
    router.replace('/(tabs)');
  }

  function next() {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finish();
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Vídeo de fundo */}
      <Video
        source={videoSource}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
        useNativeControls={false}
      />

      {/* Overlay base escura */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Slide atual */}
        <View style={styles.slide}>
          <LinearGradient
            colors={slide.overlay}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.iconWrap}>
            <Ionicons name={slide.icon} size={80} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </View>

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, {
                width: i === currentIndex ? 24 : 8,
                opacity: i === currentIndex ? 1 : 0.4,
              }]}
            />
          ))}
        </View>

        {/* Botões */}
        <View style={styles.btnRow}>
          {currentIndex < SLIDES.length - 1 ? (
            <>
              <TouchableOpacity onPress={finish} style={styles.skipBtn}>
                <Text style={styles.skipText}>Saltar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={next} style={styles.nextBtn}>
                <Text style={styles.nextText}>Seguinte</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={finish} style={[styles.nextBtn, { flex: 1 }]}>
              <Text style={styles.nextText}>Começar</Text>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 24,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 24 },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  dot: { height: 8, borderRadius: 4, backgroundColor: '#fff' },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  skipBtn: { paddingHorizontal: 20, paddingVertical: 14 },
  skipText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#e94560',
    borderRadius: 16,
    paddingVertical: 16,
  },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
