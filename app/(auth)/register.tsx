import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { GradientButton } from '@/lib/animated';
import { useTranslation } from 'react-i18next';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'professional' | 'space' | 'store'>('professional');
  const [loading, setLoading] = useState(false);

  async function signUp() {
    if (!fullName || !email || !password) {
      Alert.alert(t('common.error'), t('auth.register.errors.fillAll'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.register.errors.passwordShort'));
      return;
    }
    setLoading(true);
    console.log('[signUp] A iniciar registo para:', email);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, user_type: userType } },
      });

      console.log('[signUp] Resposta:', JSON.stringify({ data, error }));

      if (error) {
        Alert.alert('Erro', error.message);
        return;
      }

      if (data.user && !data.session) {
        Alert.alert('Confirmar email', 'Registo feito! Confirma o teu email e depois entra na app.');
        return;
      }

      if (data.user && data.session) {
        Alert.alert('Sucesso', 'Conta criada!');
      }
    } catch (e: any) {
      console.log('[signUp] Excepção:', e);
      Alert.alert('Erro inesperado', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.accent }]}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>{t('auth.register.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSub }]}>{t('auth.register.subtitle')}</Text>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('auth.register.iAm')}</Text>
        <View style={styles.typeRow}>
          {[
            { key: 'professional', emoji: '💈', label: t('auth.register.professional') },
            { key: 'space', emoji: '🏪', label: t('auth.register.space') },
            { key: 'store', emoji: '🏬', label: t('auth.register.store') },
          ].map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.typeButton, { backgroundColor: colors.card, borderColor: colors.border },
                userType === opt.key && { borderColor: colors.accent, backgroundColor: colors.accentBg }]}
              onPress={() => setUserType(opt.key as any)}>
              <Text style={styles.typeEmoji}>{opt.emoji}</Text>
              <Text style={[styles.typeText, { color: colors.textSub }, userType === opt.key && { color: colors.accent }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {userType === 'store' && (
          <View style={[styles.storeNote, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
            <Text style={[styles.storeNoteText, { color: colors.textSub }]}>
              💡 {t('auth.register.storeNote')}
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder={t('auth.register.fullName')} placeholderTextColor={colors.textMuted} value={fullName} onChangeText={setFullName} />
          <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder={t('auth.register.email')} placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder={t('auth.register.password')} placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />

          <GradientButton onPress={signUp} disabled={loading} gradientColors={colors.accentGradient} style={styles.buttonOuter} innerStyle={styles.buttonInner}>
            <Text style={styles.buttonText}>{loading ? t('auth.register.loading') : t('auth.register.createBtn')}</Text>
          </GradientButton>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={[styles.link, { color: colors.textSub }]}>{t('auth.register.hasAccount')} <Text style={[styles.linkBold, { color: colors.accent }]}>{t('auth.register.login')}</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 32, paddingTop: 60 },
  back: { marginBottom: 32 },
  backText: { fontSize: 16 },
  title: { fontSize: 36, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 32 },
  sectionLabel: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  storeNote: { borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1 },
  storeNoteText: { fontSize: 13, lineHeight: 19 },
  typeButton: { flex: 1, borderRadius: 16, paddingVertical: 20, alignItems: 'center', borderWidth: 2 },
  typeEmoji: { fontSize: 32, marginBottom: 8 },
  typeText: { fontSize: 15, fontWeight: '600' },
  form: { gap: 16, paddingBottom: 40 },
  input: { borderRadius: 14, paddingHorizontal: 20, paddingVertical: 18, fontSize: 16, borderWidth: 1 },
  buttonOuter: { marginTop: 8 },
  buttonInner: { paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  link: { textAlign: 'center', fontSize: 15, marginTop: 8 },
  linkBold: { fontWeight: '700' },
});