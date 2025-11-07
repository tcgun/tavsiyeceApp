// Metin işleme yardımcı fonksiyonları

/**
 * Türkçe karakterleri normalleştirir (arama için)
 * @param text - Normalize edilecek metin
 * @returns Normalize edilmiş metin
 */
export const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ı/g, 'i') // 'ı' -> 'i'
    .normalize('NFD') // Karakterleri ve aksanlarını ayır
    .replace(/[\u0300-\u036f]/g, '') // Aksanları kaldır (ö -> o, ü -> u)
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g');
};

