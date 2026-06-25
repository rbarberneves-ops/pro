import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, Alert, Linking, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme, ACCENT_COLORS, GRADIENT_ACCENTS } from '@/lib/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage } from '@/lib/i18n';
import { useState } from 'react';

const APP_VERSION = '1.0.0';

type RowProps = {
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  destructive?: boolean;
  colors: any;
};

function Row({ icon, iconColor, label, value, onPress, right, destructive, colors }: RowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}>
      <View style={[styles.rowIcon, { backgroundColor: iconColor ? iconColor + '22' : colors.card2 }]}>
        <Ionicons name={icon as any} size={18} color={iconColor ?? colors.textSub} />
      </View>
      <Text style={[styles.rowLabel, { color: destructive ? '#e94560' : colors.text }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={[styles.rowValue, { color: colors.textMuted }]}>{value}</Text> : null}
        {right ?? null}
        {onPress && !right ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
      </View>
    </TouchableOpacity>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={[styles.sectionCard, { borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { isDark, colors, accentColor, toggleTheme, setAccentColor } = useTheme();
  const { t, i18n } = useTranslation();
  const [showLangModal, setShowLangModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState(i18n.language ?? 'pt');

  const currentLang = LANGUAGES.find(l => l.code === selectedLang);

  async function handleSelectLang(code: string) {
    setSelectedLang(code);
    await changeLanguage(code);
    setShowLangModal(false);
  }

  async function handleLogout() {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.yes'), style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)');
        }
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => Alert.alert(t('settings.deleteAccount'), t('settings.deleteAccountContact')) },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>

      {/* Modal seletor de língua */}
      <Modal visible={showLangModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.language')}</Text>
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langItem, { borderColor: colors.border }, selectedLang === lang.code && { borderColor: colors.accent, backgroundColor: colors.accentBg }]}
                onPress={() => handleSelectLang(lang.code)}>
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, { color: colors.text }, selectedLang === lang.code && { color: colors.accent, fontWeight: '700' }]}>{lang.label}</Text>
                {selectedLang === lang.code && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowLangModal(false)} style={[styles.langCancel, { borderColor: colors.border }]}>
              <Text style={[styles.langCancelText, { color: colors.textSub }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings.title')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* PREMIUM */}
        <TouchableOpacity
          style={styles.premiumBanner}
          onPress={() => router.push('/premium')}
          activeOpacity={0.85}>
          <View style={styles.premiumLeft}>
            <Ionicons name="star" size={24} color="#fff" />
            <View style={{ gap: 2 }}>
              <Text style={styles.premiumTitle}>PRO Premium</Text>
              <Text style={styles.premiumSub}>{t('settings.premiumSub')}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        {/* CONTA */}
        <Section title={t('settings.sectionAccount')} colors={colors}>
          <Row
            colors={colors}
            icon="person-outline"
            iconColor="#5856d6"
            label={t('settings.editProfile')}
            onPress={() => router.push('/edit-profile')}
          />
          <Row
            colors={colors}
            icon="lock-closed-outline"
            iconColor="#34c759"
            label={t('settings.changePassword')}
            onPress={() => Alert.alert(t('settings.passwordTitle'), t('settings.passwordResetInfo'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('settings.sendEmail'), onPress: async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user.email) {
                  await supabase.auth.resetPasswordForEmail(session.user.email);
                  Alert.alert(t('settings.emailSent'), t('settings.checkInbox'));
                }
              }}
            ])}
          />
          <Row
            colors={colors}
            icon="notifications-outline"
            iconColor="#ff9500"
            label={t('settings.notifications')}
            onPress={() => Alert.alert(t('settings.soon'), t('settings.notificationsSoon'))}
          />
        </Section>

        {/* PREFERÊNCIAS */}
        <Section title={t('settings.sectionPreferences')} colors={colors}>
          <Row
            colors={colors}
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            iconColor={isDark ? '#5856d6' : '#ff9500'}
            label={isDark ? t('settings.darkTheme') : t('settings.lightTheme')}
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#e0e0e0', true: '#e9456044' }}
                thumbColor={isDark ? '#e94560' : '#ffffff'}
              />
            }
          />
          <View style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: accentColor + '22' }]}>
              <Ionicons name="color-palette-outline" size={18} color={accentColor} />
            </View>
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings.accentColor')}</Text>
              <View style={styles.colorRow}>
                {ACCENT_COLORS.map(c => (
                  <TouchableOpacity
                    key={c.hex}
                    onPress={() => setAccentColor(c.hex)}
                    style={[styles.colorSwatch, { backgroundColor: c.hex }, accentColor === c.hex && styles.colorSwatchActive]}>
                    {accentColor === c.hex && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.gradientLabel, { color: colors.textMuted }]}>{t('settings.gradients')}</Text>
              <View style={styles.colorRow}>
                {GRADIENT_ACCENTS.map(g => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setAccentColor(g.id)}
                    style={[styles.colorSwatch, accentColor === g.id && styles.colorSwatchActive]}>
                    <LinearGradient
                      colors={g.colors as [string, string]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill} />
                    {accentColor === g.id && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <Row
            colors={colors}
            icon="language-outline"
            iconColor="#007aff"
            label={t('settings.language')}
            value={`${currentLang?.flag} ${currentLang?.label}`}
            onPress={() => setShowLangModal(true)}
          />
        </Section>

        {/* SOBRE */}
        <Section title={t('settings.sectionAbout')} colors={colors}>
          <Row
            colors={colors}
            icon="document-text-outline"
            iconColor="#007aff"
            label={t('settings.termsConditions')}
            onPress={() => router.push('/terms')}
          />
          <Row
            colors={colors}
            icon="shield-checkmark-outline"
            iconColor="#34c759"
            label={t('settings.privacyPolicy')}
            onPress={() => router.push('/privacy')}
          />
          <Row
            colors={colors}
            icon="star-outline"
            iconColor="#ff9500"
            label={t('settings.rate')}
            onPress={() => Alert.alert(t('settings.thanks'), t('settings.rateSoon'))}
          />
          <Row
            colors={colors}
            icon="mail-outline"
            iconColor="#5856d6"
            label={t('settings.contact')}
            onPress={() => Linking.openURL('mailto:suporte@proapp.pt')}
          />
          <Row
            colors={colors}
            icon="information-circle-outline"
            iconColor={colors.textMuted}
            label={t('settings.version')}
            value={APP_VERSION}
          />
        </Section>

        {/* SESSÃO */}
        <Section title={t('settings.sectionSession')} colors={colors}>
          <Row
            colors={colors}
            icon="log-out-outline"
            iconColor="#e94560"
            label={t('settings.logout')}
            destructive
            onPress={handleLogout}
          />
          <Row
            colors={colors}
            icon="trash-outline"
            iconColor="#e94560"
            label={t('settings.deleteAccount')}
            destructive
            onPress={handleDeleteAccount}
          />
        </Section>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  langItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  langFlag: { fontSize: 26 },
  langLabel: { flex: 1, fontSize: 16 },
  langCancel: { borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, marginTop: 4 },
  langCancelText: { fontSize: 15, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  section: { marginTop: 28, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 14 },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', paddingBottom: 4 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  colorSwatchActive: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  gradientLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 4 },
  premiumBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 20, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, backgroundColor: '#f0a500' },
  premiumLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  premiumTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  premiumSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
});
