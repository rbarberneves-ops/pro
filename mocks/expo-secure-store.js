// Web stub for expo-secure-store — usa localStorage em web
export async function getItemAsync(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
export async function setItemAsync(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
export async function deleteItemAsync(key) {
  try { localStorage.removeItem(key); } catch {}
}
