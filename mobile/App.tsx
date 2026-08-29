import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/core/auth/AuthProvider';
import { AppRoot } from './src/application/AppRoot';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
