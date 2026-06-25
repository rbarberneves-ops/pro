/**
 * Componentes animados reutilizáveis — Reanimated 4
 */
import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, TouchableOpacity, View, ViewStyle, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Sombra com profundidade — aplicar no container externo de qualquer botão gradiente
export const depthShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.22,
  shadowRadius: 8,
  elevation: 6,
};

// Botão gradiente reutilizável com profundidade
export function GradientButton({
  onPress,
  disabled,
  style,
  innerStyle,
  gradientColors,
  children,
  activeOpacity = 0.85,
}: {
  onPress: () => void;
  disabled?: boolean;
  style?: any;
  innerStyle?: any;
  gradientColors: string[];
  children: React.ReactNode;
  activeOpacity?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  }

  const gradColors = (gradientColors.length >= 2 ? gradientColors : [gradientColors[0], gradientColors[0]]) as [string, string];

  return (
    <Animated.View style={[depthShadow, { borderRadius: 14, transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        activeOpacity={1}
        style={{ borderRadius: 14, overflow: 'hidden' }}>
        <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={innerStyle}>
          {/* Highlight superior para efeito 3D */}
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {children}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Botão com scale ao pressionar — substitui TouchableOpacity em CTAs importantes
export function AnimatedPressable({
  children,
  style,
  scaleDown = 0.95,
  ...props
}: PressableProps & { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; scaleDown?: number }) {
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scale, {
      toValue: scaleDown,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  function onPressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  }

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} {...props}>
      <Animated.View style={[style as any, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Fade + slide up — para itens de lista ao aparecer
export function FadeInView({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle | ViewStyle[];
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        speed: 18,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style as any, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// Heart bounce para o like
export function useLikeAnimation() {
  const scale = useRef(new Animated.Value(1)).current;

  function bounce() {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 50, bounciness: 10 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }),
    ]).start();
  }

  return { scale, bounce };
}
