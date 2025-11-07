// Tarih/saat ile ilgili yardımcı fonksiyonlar

/**
 * Firebase timestamp'ini göreli zaman formatına çevirir
 * @param timestamp - Firebase timestamp
 * @returns Formatlanmış zaman string'i
 */
export const formatRelativeTime = (timestamp: any): string => {
  if (!timestamp || !timestamp.seconds) return 'şimdi';
  
  try {
    const now = new Date();
    const date = timestamp.toDate();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'şimdi';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dk önce`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`;
    
    return date.toLocaleDateString('tr-TR');
  } catch {
    return 'şimdi';
  }
};

/**
 * Firebase timestamp'ini saat formatına çevirir
 * @param timestamp - Firebase timestamp
 * @returns Formatlanmış saat string'i
 */
export const formatTime = (timestamp: any): string => {
  if (!timestamp || typeof timestamp.toDate !== 'function') return 'şimdi';
  
  try {
    return timestamp.toDate().toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return 'şimdi';
  }
};

