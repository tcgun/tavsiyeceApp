import { View } from 'react-native';

// Bu sayfa hiçbir zaman görünmeyecek.
// _layout.tsx dosyasındaki "listener", bu sayfanın açılmasını engelleyip
// bunun yerine '/create-recommendation' modal'ını açacak.
export default function CreateTabPlaceholder() {
  return <View />;
}