// Avatar ile ilgili yardımcı fonksiyonlar

/**
 * Kullanıcı için avatar URL'i oluşturur
 * @param name - Kullanıcı adı
 * @param username - Kullanıcı adı (opsiyonel)
 * @returns Avatar URL'i
 */
export const getAvatarUrl = (name?: string, username?: string): string => {
  const displayName = name || username || '?';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
};

/**
 * Kullanıcı için avatar URL'i oluşturur (mevcut photoURL varsa onu kullanır)
 * @param photoURL - Mevcut fotoğraf URL'i
 * @param name - Kullanıcı adı
 * @param username - Kullanıcı adı (opsiyonel)
 * @returns Avatar URL'i
 */
export const getAvatarUrlWithFallback = (
  photoURL: string | null | undefined,
  name?: string,
  username?: string
): string => {
  if (photoURL) return photoURL;
  return getAvatarUrl(name, username);
};

