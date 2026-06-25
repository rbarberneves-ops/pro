import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';

const LAST_UPDATED = '22 de junho de 2026';
const APP_NAME = 'PRO';
const COMPANY = 'PRO Technologies, Lda.';
const EMAIL = 'privacidade@proapp.pt';

type Section = { title: string; body: string };

const SECTIONS: Section[] = [
  {
    title: '1. Responsável pelo Tratamento',
    body: `A ${COMPANY} ("nós", "nosso") é o responsável pelo tratamento dos teus dados pessoais recolhidos através da aplicação ${APP_NAME}.\n\nContacto do Encarregado de Protecção de Dados: ${EMAIL}`,
  },
  {
    title: '2. Dados que Recolhemos',
    body: 'Recolhemos os seguintes tipos de dados pessoais:\n\n• Dados de identificação: nome, endereço de email, fotografia de perfil\n• Dados de actividade profissional: tipo de profissional, especialidades, portfolio\n• Dados de localização: cidade, morada (opcional), coordenadas GPS (apenas quando fornecidas)\n• Dados de utilização: interacções na plataforma, mensagens, publicações\n• Dados técnicos: endereço IP, tipo de dispositivo, sistema operativo, token de notificações push\n• Dados de pagamento: processados por terceiros — não armazenamos dados de cartão',
  },
  {
    title: '3. Finalidade do Tratamento',
    body: 'Utilizamos os teus dados para:\n\n• Prestar o serviço de ligação entre profissionais e espaços\n• Gerir a tua conta e autenticação\n• Enviar notificações relevantes para o uso da Aplicação\n• Processar pagamentos de subscrição Premium\n• Melhorar a Aplicação através de análise de utilização\n• Garantir a segurança e prevenir fraudes\n• Cumprir obrigações legais\n• Responder a pedidos de suporte',
  },
  {
    title: '4. Base Legal do Tratamento',
    body: 'O tratamento dos teus dados baseia-se em:\n\n• Execução de contrato: tratamento necessário para prestar o serviço (art. 6.º, n.º 1, al. b) RGPD)\n• Consentimento: para notificações push e dados de localização — podes retirar a qualquer momento\n• Interesse legítimo: segurança da plataforma e prevenção de fraudes (art. 6.º, n.º 1, al. f) RGPD)\n• Obrigação legal: cumprimento de requisitos legais aplicáveis (art. 6.º, n.º 1, al. c) RGPD)',
  },
  {
    title: '5. Partilha de Dados',
    body: 'Não vendemos os teus dados pessoais. Partilhamos dados apenas com:\n\n• Supabase (EUA/UE): infraestrutura de base de dados e autenticação, sob cláusulas contratuais-tipo da UE\n• Fornecedores de pagamento (ex. RevenueCat, Apple, Google): processamento de subscrições, sob os seus próprios termos de privacidade\n• Fornecedores de notificações push: entrega de notificações na aplicação\n• Autoridades competentes: quando exigido por lei\n\nTodos os subcontratantes são seleccionados com base em garantias adequadas de protecção de dados.',
  },
  {
    title: '6. Transferências Internacionais',
    body: 'Alguns dos nossos fornecedores estão localizados fora da União Europeia. Nestes casos, garantimos que as transferências de dados são efectuadas com base em:\n\n• Decisões de adequação da Comissão Europeia\n• Cláusulas contratuais-tipo aprovadas pela Comissão Europeia\n• Outros mecanismos legais equivalentes',
  },
  {
    title: '7. Retenção de Dados',
    body: 'Os teus dados são conservados enquanto mantiveres uma conta activa. Após eliminação da conta:\n\n• Dados de perfil: eliminados em 30 dias\n• Mensagens: eliminadas em 30 dias\n• Dados de pagamento: conservados 10 anos (obrigação fiscal)\n• Registos de segurança: conservados 12 meses\n• Dados anonimizados para estatísticas: conservados indefinidamente',
  },
  {
    title: '8. Os Teus Direitos (RGPD)',
    body: 'Ao abrigo do Regulamento Geral sobre a Protecção de Dados (RGPD), tens os seguintes direitos:\n\n• Acesso: solicitar uma cópia dos teus dados\n• Rectificação: corrigir dados inexactos\n• Apagamento: solicitar a eliminação dos teus dados ("direito ao esquecimento")\n• Limitação: restringir o tratamento em determinadas circunstâncias\n• Portabilidade: receber os teus dados num formato estruturado e legível\n• Oposição: opor-te ao tratamento baseado em interesse legítimo\n• Retirada de consentimento: a qualquer momento, sem afectar a licitude do tratamento anterior\n\nPara exerceres os teus direitos, contacta-nos em: ' + EMAIL,
  },
  {
    title: '9. Segurança dos Dados',
    body: 'Implementamos medidas técnicas e organizativas adequadas para proteger os teus dados:\n\n• Cifração de dados em trânsito (HTTPS/TLS)\n• Cifração de dados em repouso\n• Políticas de acesso restrito (Row Level Security)\n• Autenticação segura via Supabase Auth\n• Monitorização de acessos suspeitos\n• Auditorias periódicas de segurança\n\nApesar destas medidas, nenhum sistema é 100% seguro. Em caso de violação de dados que afecte os teus direitos, serás notificado dentro de 72 horas conforme exigido pelo RGPD.',
  },
  {
    title: '10. Cookies e Tecnologias Semelhantes',
    body: 'A Aplicação utiliza armazenamento local no dispositivo (AsyncStorage) para:\n\n• Manter a sessão autenticada\n• Guardar preferências de tema e cor\n• Registar o estado do onboarding\n• Guardar dados de notificações não lidas\n\nNão utilizamos cookies de rastreamento publicitário de terceiros.',
  },
  {
    title: '11. Menores de Idade',
    body: 'A Aplicação não é destinada a menores de 18 anos. Não recolhemos intencionalmente dados de menores. Se tomarmos conhecimento de que recolhemos dados de um menor, eliminaremos esses dados imediatamente.\n\nSe acreditares que um menor registou uma conta, contacta-nos em ' + EMAIL,
  },
  {
    title: '12. Reclamações',
    body: 'Tens o direito de apresentar reclamação à autoridade de supervisão competente. Em Portugal, a autoridade competente é:\n\nComissão Nacional de Protecção de Dados (CNPD)\nRua de São Bento, 148-3.º\n1200-821 Lisboa\nwww.cnpd.pt\n\nEncorajamos-te a contactar-nos primeiro para resolver qualquer questão directamente.',
  },
  {
    title: '13. Alterações a Esta Política',
    body: 'Podemos actualizar esta Política de Privacidade periodicamente. Notificar-te-emos sobre alterações significativas através da Aplicação. A data de última actualização é indicada no topo deste documento.\n\nO uso continuado da Aplicação após alterações constitui aceitação da nova Política.',
  },
  {
    title: '14. Contacto',
    body: `Para questões sobre privacidade e protecção de dados:\n\n${COMPANY}\nEmail: ${EMAIL}\nWebsite: proapp.pt/privacidade`,
  },
];

export default function PrivacyScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Política de Privacidade</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.appName, { color: colors.accent }]}>{APP_NAME}</Text>
        <Text style={[styles.updated, { color: colors.textMuted }]}>Última actualização: {LAST_UPDATED}</Text>

        {/* RGPD badge */}
        <View style={[styles.rgpdBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark" size={18} color="#34c759" />
          <Text style={[styles.rgpdText, { color: colors.textSub }]}>
            Esta política cumpre o Regulamento Geral sobre a Protecção de Dados (RGPD — UE 2016/679)
          </Text>
        </View>

        {SECTIONS.map(s => (
          <View key={s.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{s.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.textSub }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },
  appName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  updated: { fontSize: 13, marginBottom: 16 },
  rgpdBadge: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 24 },
  rgpdText: { flex: 1, fontSize: 13, lineHeight: 19 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionBody: { fontSize: 14, lineHeight: 22 },
});
