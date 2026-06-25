/**
 * RevenueCat integration for PRO app
 *
 * Setup:
 *   npx expo install react-native-purchases
 *   Then add to app.json plugins: ["react-native-purchases"]
 *
 * Dashboard: https://app.revenuecat.com
 * - Create project → add iOS/Android apps
 * - Create products in App Store Connect / Google Play Console
 * - Create Entitlement "premium" → attach products
 * - Create Offering "default" → add packages (monthly, yearly)
 */

// RevenueCat API Keys (substituir pelas reais do dashboard)
export const RC_API_KEY_IOS = 'appl_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
export const RC_API_KEY_ANDROID = 'goog_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

// Entitlement identifier (criar no RevenueCat dashboard)
export const PREMIUM_ENTITLEMENT_ID = 'premium';

// Product identifiers (criar no App Store Connect / Google Play)
export const PRODUCT_MONTHLY = 'pro_premium_monthly';   // €9,99/mês
export const PRODUCT_YEARLY = 'pro_premium_yearly';     // €79,99/ano

let Purchases: any = null;

async function loadPurchases() {
  if (Purchases) return Purchases;
  try {
    const mod = await import('react-native-purchases');
    Purchases = mod.default;
    return Purchases;
  } catch {
    // Not available in Expo Go
    return null;
  }
}

export async function initRevenueCat(userId: string) {
  const P = await loadPurchases();
  if (!P) return;
  const { Platform } = await import('react-native');
  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  await P.configure({ apiKey });
  await P.logIn(userId);
}

export async function getOfferings() {
  const P = await loadPurchases();
  if (!P) return null;
  try {
    return await P.getOfferings();
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: any) {
  const P = await loadPurchases();
  if (!P) throw new Error('RevenueCat não disponível em Expo Go. Usa EAS Build.');
  return await P.purchasePackage(pkg);
}

export async function restorePurchases() {
  const P = await loadPurchases();
  if (!P) throw new Error('RevenueCat não disponível em Expo Go. Usa EAS Build.');
  return await P.restorePurchases();
}

export async function checkPremiumEntitlement(): Promise<boolean> {
  const P = await loadPurchases();
  if (!P) return false;
  try {
    const info = await P.getCustomerInfo();
    return !!info.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  } catch {
    return false;
  }
}
