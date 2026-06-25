import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';

const LAST_UPDATED = '22 de junho de 2026';
const APP_NAME = 'PRO';
const COMPANY = 'PRO Technologies, Lda.';
const EMAIL = 'suporte@proapp.pt';

type Section = { title: string; body: string };

const SECTIONS: Section[] = [
  {
    title: '1. Aceitação dos Termos',
    body: `Ao aceder ou utilizar a aplicação ${APP_NAME} ("Aplicação"), aceitas ficar vinculado aos presentes Termos e Condições ("Termos"). Se não concordares com estes Termos, não deves utilizar a Aplicação.\n\nEstes Termos constituem um acordo legalmente vinculativo entre ti e a ${COMPANY}, com sede em Portugal.`,
  },
  {
    title: '2. Descrição do Serviço',
    body: `O ${APP_NAME} é uma plataforma que conecta profissionais de beleza (cabeleireiros, esteticistas, barbeiros, entre outros) com espaços disponíveis para o exercício da sua actividade. A Aplicação permite:\n\n• Criação e gestão de perfis de profissional ou espaço\n• Descoberta e contacto entre utilizadores\n• Publicação de portfolios e disponibilidades\n• Sistema de mensagens directas\n• Avaliações e classificações mútuas\n• Subscrição de plano Premium`,
  },
  {
    title: '3. Elegibilidade',
    body: 'Para utilizar a Aplicação, deves ter pelo menos 18 anos de idade e ter capacidade jurídica para celebrar contratos. Ao criares uma conta, declaras e garantes que cumpres estes requisitos.\n\nA Aplicação é destinada exclusivamente a profissionais do sector da beleza e bem-estar e a proprietários de espaços relacionados com este sector.',
  },
  {
    title: '4. Conta de Utilizador',
    body: 'Para aceder à maioria das funcionalidades, é necessário criar uma conta. Ao registares-te, comprometes-te a:\n\n• Fornecer informações verdadeiras, exactas e completas\n• Manter as informações da conta actualizadas\n• Manter a confidencialidade da tua palavra-passe\n• Notificar-nos imediatamente de qualquer uso não autorizado da tua conta\n\nÉs responsável por todas as actividades que ocorram na tua conta. A ${COMPANY} não se responsabiliza por perdas decorrentes do uso não autorizado da tua conta.',
  },
  {
    title: '5. Conteúdo do Utilizador',
    body: `Ao publicares conteúdo na Aplicação (textos, imagens, avaliações, mensagens), concedes à ${COMPANY} uma licença não exclusiva, mundial, gratuita e transferível para usar, reproduzir, modificar e exibir esse conteúdo no âmbito da prestação do serviço.\n\nDeclaras que:\n\n• És o titular ou tens os direitos necessários sobre o conteúdo que publicas\n• O conteúdo não viola direitos de terceiros\n• O conteúdo não é ilegal, ofensivo, difamatório ou enganoso\n\nReservamo-nos o direito de remover qualquer conteúdo que viole estes Termos.`,
  },
  {
    title: '6. Conduta Proibida',
    body: 'É estritamente proibido:\n\n• Publicar informações falsas ou enganosas\n• Fazer-se passar por outra pessoa ou entidade\n• Assediar, ameaçar ou intimidar outros utilizadores\n• Publicar conteúdo ilegal, obsceno ou ofensivo\n• Tentar obter acesso não autorizado a sistemas\n• Utilizar a Aplicação para fins comerciais não autorizados\n• Recolher dados de outros utilizadores sem consentimento\n• Interferir com o funcionamento normal da Aplicação',
  },
  {
    title: '7. Subscrição Premium',
    body: `O ${APP_NAME} oferece uma subscrição Premium mediante pagamento. Ao subscreveres:\n\n• Autorizes a cobrança periódica do valor do plano escolhido\n• A subscrição renova-se automaticamente salvo cancelamento\n• Podes cancelar a qualquer momento nas definições da conta\n• Não são efectuados reembolsos por períodos parciais\n• Os preços podem ser alterados com aviso prévio de 30 dias\n\nO pagamento é processado através de fornecedores externos seguros. A ${COMPANY} não armazena dados de cartão de crédito.`,
  },
  {
    title: '8. Limitação de Responsabilidade',
    body: `A ${COMPANY} não garante que:\n\n• A Aplicação estará sempre disponível ou isenta de erros\n• Os resultados obtidos através da Aplicação serão precisos ou fiáveis\n• Quaisquer erros serão corrigidos\n\nA ${COMPANY} não se responsabiliza por danos indirectos, incidentais ou consequentes resultantes do uso ou incapacidade de uso da Aplicação, incluindo perda de negócio ou dados.\n\nA responsabilidade total da ${COMPANY} para contigo, por qualquer causa, não excederá o valor pago nos últimos 12 meses.`,
  },
  {
    title: '9. Propriedade Intelectual',
    body: `A Aplicação e todo o seu conteúdo original, funcionalidades e design são propriedade exclusiva da ${COMPANY} e estão protegidos por leis de direitos de autor, marcas registadas e outros direitos de propriedade intelectual.\n\nNão podes copiar, modificar, distribuir, vender ou fazer engenharia reversa de qualquer parte da Aplicação sem autorização prévia e escrita.`,
  },
  {
    title: '10. Rescisão',
    body: 'Podemos suspender ou terminar a tua conta a qualquer momento, sem aviso prévio, se considerarmos que violaste estes Termos ou por qualquer outro motivo legítimo.\n\nPodes eliminar a tua conta a qualquer momento através das Definições. Após eliminação, os teus dados serão removidos nos termos da nossa Política de Privacidade.',
  },
  {
    title: '11. Alterações aos Termos',
    body: 'Reservamo-nos o direito de modificar estes Termos a qualquer momento. As alterações entram em vigor imediatamente após publicação na Aplicação. O uso continuado da Aplicação após a publicação de alterações constitui a tua aceitação dos novos Termos.\n\nRecomendamos que revises periodicamente estes Termos.',
  },
  {
    title: '12. Lei Aplicável',
    body: 'Estes Termos são regidos e interpretados de acordo com a lei portuguesa. Qualquer litígio decorrente destes Termos será submetido à jurisdição exclusiva dos tribunais de Lisboa, Portugal, sem prejuízo de disposições imperativas de protecção do consumidor.',
  },
  {
    title: '13. Contacto',
    body: `Para questões sobre estes Termos, contacta-nos:\n\n${COMPANY}\nEmail: ${EMAIL}\nWebsite: proapp.pt`,
  },
];

export default function TermsScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Termos e Condições</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.appName, { color: colors.accent }]}>{APP_NAME}</Text>
        <Text style={[styles.updated, { color: colors.textMuted }]}>Última actualização: {LAST_UPDATED}</Text>
        <Text style={[styles.intro, { color: colors.textSub }]}>
          Lê atentamente estes Termos e Condições antes de utilizares a aplicação {APP_NAME}.
        </Text>

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
  intro: { fontSize: 15, lineHeight: 22, marginBottom: 24, fontStyle: 'italic' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionBody: { fontSize: 14, lineHeight: 22 },
});
