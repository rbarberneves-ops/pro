import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { getOfferings, purchasePackage, restorePurchases, PRODUCT_MONTHLY, PRODUCT_YEARLY } from '@/lib/purchases';

const PLANS = [
  { id: 'monthly', label: 'Mensal', price: '€9,99', period: '/mês', popular: false },
  { id: 'yearly', label: 'Anual', price: '€79,99', period: '/ano', popular: true, saving: 'Poupa 33%' },
];

const BENEFITS = [
  { icon: 'star' as const, title: 'Apareces primeiro', desc: 'O teu perfil é destacado no topo dos resultados do Descobrir.' },
  { icon: 'medal' as const, title: 'Badge Premium', desc: 'Ícone dourado ⭐ visível no teu perfil, feed, chat e matches.' },
  { icon: 'trending-up' as const, title: 'Mais visibilidade', desc: 'Mais interações, mais matches, mais oportunidades.' },
  { icon: 'infinite' as const, title: 'Acesso ilimitado', desc: 'Sem limites de likes, mensagens ou publicações.' },
  { icon: 'headset' as const, title: 'Suporte prioritário', desc: 'Respostas em menos de 24 horas da nossa equipa.' },
];

export default function PremiumScreen() {
  const { colors } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);
  const [rcPackages, setRcPackages] = useState<Record<string, any>>({});

  useEffect(() => {
    // Tenta carregar offerings do RevenueCat (só funciona em EAS build)
    getOfferings().then(offerings => {
      if (!offerings?.current?.availablePackages) return;
      const pkgs: Record<string, any> = {};
      for (const pkg of offerings.current.availablePackages) {
        if (pkg.product.identifier === PRODUCT_MONTHLY) pkgs.monthly = pkg;
        if (pkg.product.identifier === PRODUCT_YEARLY) pkgs.yearly = pkg;
      }
      setRcPackages(pkgs);
    });
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const rcPkg = rcPackages[selectedPlan];
      if (rcPkg) {
        // Fluxo RevenueCat (EAS build)
        const { customerInfo } = await purchasePackage(rcPkg);
        const isPremium = !!customerInfo.entitlements.active['premium'];
        if (isPremium) {
          // Sync com Supabase
          const daysToAdd = selectedPlan === 'yearly' ? 365 : 30;
          const premiumUntil = new Date();
          premiumUntil.setDate(premiumUntil.getDate() + daysToAdd);
          await supabase.from('profiles').update({ premium: true, premium_until: premiumUntil.toISOString() }).eq('id', session.user.id);
          Alert.alert('🌟 Bem-vindo ao PRO Premium!', 'O teu perfil está agora destacado!', [{ text: 'Continuar', onPress: () => router.back() }]);
        }
      } else {
        // Fallback manual (Expo Go / teste)
        const daysToAdd = selectedPlan === 'yearly' ? 365 : 30;
        const premiumUntil = new Date();
        premiumUntil.setDate(premiumUntil.getDate() + daysToAdd);
        const { error } = await supabase.from('profiles').update({ premium: true, premium_until: premiumUntil.toISOString() }).eq('id', session.user.id);
        if (error) { Alert.alert('Erro', error.message); return; }
        Alert.alert('🌟 Bem-vindo ao PRO Premium!', 'O teu perfil está agora destacado. Apareces primeiro nos resultados!', [{ text: 'Continuar', onPress: () => router.back() }]);
      }
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setLoading(true);
    try {
      const customerInfo = await restorePurchases();
      const isPremium = !!customerInfo.entitlements.active['premium'];
      if (isPremium) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await supabase.from('profiles').update({ premium: true }).eq('id', session.user.id);
        Alert.alert('Subscrição restaurada!', 'O teu acesso Premium foi recuperado.');
      } else {
        Alert.alert('Sem subscrição ativa', 'Não encontrámos nenhuma compra anterior.');
      }
    } catch (e: any) {
      Alert.alert('Erro ao restaurar', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>PRO Premium</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <LinearGradient
          colors={['#f0a500', '#e8830a']}
          style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="star" size={48} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Eleva o teu perfil</Text>
          <Text style={styles.heroSub}>Destaca-te entre milhares de profissionais e espaços</Text>
        </LinearGradient>

        {/* Planos */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ESCOLHE O TEU PLANO</Text>
          <View style={styles.plansRow}>
            {PLANS.map(plan => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedPlan === plan.id && { borderColor: '#f0a500', borderWidth: 2 },
                ]}
                onPress={() => setSelectedPlan(plan.id as 'monthly' | 'yearly')}
                activeOpacity={0.8}>
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>POPULAR</Text>
                  </View>
                )}
                <Text style={[styles.planLabel, { color: colors.textSub }]}>{plan.label}</Text>
                <Text style={[styles.planPrice, { color: colors.text }]}>{plan.price}</Text>
                <Text style={[styles.planPeriod, { color: colors.textMuted }]}>{plan.period}</Text>
                {plan.saving && (
                  <View style={styles.savingBadge}>
                    <Text style={styles.savingText}>{plan.saving}</Text>
                  </View>
                )}
                {selectedPlan === plan.id && (
                  <View style={styles.selectedCheck}>
                    <Ionicons name="checkmark-circle" size={20} color="#f0a500" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Benefícios */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>O QUE INCLUI</Text>
          <View style={[styles.benefitsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {BENEFITS.map((b, i) => (
              <View
                key={b.title}
                style={[
                  styles.benefitRow,
                  i < BENEFITS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}>
                <View style={styles.benefitIcon}>
                  <Ionicons name={b.icon} size={22} color="#f0a500" />
                </View>
                <View style={styles.benefitText}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>{b.title}</Text>
                  <Text style={[styles.benefitDesc, { color: colors.textSub }]}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Nota */}
        <Text style={[styles.note, { color: colors.textMuted }]}>
          A subscrição renova automaticamente. Podes cancelar a qualquer momento nas definições da conta.
        </Text>
        <TouchableOpacity onPress={handleRestore} style={{ alignSelf: 'center', marginTop: 8, padding: 8 }}>
          <Text style={[styles.note, { color: colors.accent, textDecorationLine: 'underline' }]}>Restaurar compras anteriores</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* CTA fixo */}
      <View style={[styles.ctaBar, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, loading && { opacity: 0.7 }]}
          onPress={subscribe}
          disabled={loading}
          activeOpacity={0.85}>
          <LinearGradient colors={colors.accentGradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGrad}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="star" size={20} color="#fff" />
                  <Text style={styles.ctaText}>
                    Subscrever — {PLANS.find(p => p.id === selectedPlan)?.price}
                    {PLANS.find(p => p.id === selectedPlan)?.period}
                  </Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  hero: { marginHorizontal: 16, marginTop: 20, borderRadius: 20, padding: 28, alignItems: 'center', gap: 12 },
  heroIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 },
  section: { paddingHorizontal: 16, marginTop: 28 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12 },
  plansRow: { flexDirection: 'row', gap: 12 },
  planCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, gap: 4, minHeight: 130, justifyContent: 'center', position: 'relative' },
  planLabel: { fontSize: 13, fontWeight: '600' },
  planPrice: { fontSize: 22, fontWeight: '800' },
  planPeriod: { fontSize: 12 },
  popularBadge: { position: 'absolute', top: -1, left: 0, right: 0, backgroundColor: '#f0a500', borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingVertical: 4, alignItems: 'center' },
  popularText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  savingBadge: { backgroundColor: '#f0a50022', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  savingText: { color: '#f0a500', fontSize: 11, fontWeight: '700' },
  selectedCheck: { position: 'absolute', bottom: 10, right: 10 },
  benefitsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 14 },
  benefitIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f0a50015', alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, gap: 3 },
  benefitTitle: { fontSize: 15, fontWeight: '700' },
  benefitDesc: { fontSize: 13, lineHeight: 18 },
  note: { fontSize: 12, textAlign: 'center', paddingHorizontal: 32, marginTop: 20, lineHeight: 18 },
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, borderTopWidth: 1 },
  ctaBtn: { borderRadius: 16, overflow: 'hidden' },
  ctaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
