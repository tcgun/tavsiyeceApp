// Firebase SDK bileşenlerini içe aktar
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
const requiredEnvVars = [
  { key: 'apiKey', name: 'EXPO_PUBLIC_API_KEY' },
  { key: 'authDomain', name: 'EXPO_PUBLIC_AUTH_DOMAIN' },
  { key: 'projectId', name: 'EXPO_PUBLIC_PROJECT_ID' },
  { key: 'storageBucket', name: 'EXPO_PUBLIC_STORAGE_BUCKET' },
  { key: 'messagingSenderId', name: 'EXPO_PUBLIC_MESSAGING_SENDER_ID' },
  { key: 'appId', name: 'EXPO_PUBLIC_APP_ID' },
];

const missingVars = requiredEnvVars.filter(env => !firebaseConfig[env.key as keyof typeof firebaseConfig]);

if (missingVars.length > 0) {
  console.error("HATA: Firebase yapılandırma değişkenleri eksik:");
  missingVars.forEach(env => {
    console.error(`  - ${env.name} (${env.key})`);
  });
  console.error("Lütfen .env dosyasını oluşturduğunuzdan ve 'npx expo start -c' ile yeniden başlattığınızdan emin olun.");
  
  // Development ortamında devam etmek için boş bir config ile başlat
  // Production'da bu hata fırlatılmalı
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Firebase yapılandırma değişkenleri eksik. Lütfen .env dosyasını kontrol edin.');
  }
}

// 🚀 Firebase'i başlat
const app = initializeApp(firebaseConfig);

// 🔄 Servisleri export et
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;