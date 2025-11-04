// contexts/AuthContext.tsx
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth } from '../firebaseConfig'; // firebaseConfig yolunu kontrol edin

// Context'in tipini tanımla
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

// Context'i oluştur
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true, // Başlangıçta yükleniyor
});

// Provider bileşeni (Uygulamayı sarmalayacak)
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Firebase'den auth durumu değişikliklerini dinle
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Kullanıcı varsa user state'ini, yoksa null olarak ayarla
      setIsLoading(false); // Yükleme bitti
    });

    // Component unmount olduğunda listener'ı temizle
    return () => unsubscribe();
  }, []); // Sadece component mount olduğunda çalışır

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook (Context'i kolayca kullanmak için)
export const useAuth = () => {
  return useContext(AuthContext);
};