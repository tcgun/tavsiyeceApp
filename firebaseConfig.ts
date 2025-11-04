// Firebase SDK bileşenlerini içe aktar
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 🔐 .env dosyasından Firebase yapılandırma bilgilerini çek
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_APP_ID
};

// Değerlerin gelip gelmediğini kontrol et (önemli)
if (!firebaseConfig.apiKey) {
  console.error("HATA: .env dosyasındaki Firebase API anahtarı (EXPO_PUBLIC_API_KEY) bulunamadı.");
  console.error("Lütfen .env dosyasını oluşturduğunuzdan ve 'npx expo start -c' ile yeniden başlattığınızdan emin olun.");
}

// 🚀 Firebase'i başlat
const app = initializeApp(firebaseConfig);

// 🔄 Servisleri export et
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;

