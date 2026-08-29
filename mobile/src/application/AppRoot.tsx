import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../core/auth/AuthProvider';
import { LoginScreen } from '../features/auth/LoginScreen';
import { colors } from '../shared/theme/colors';
import { AppNavigator } from './navigation/AppNavigator';

export function AppRoot() {
  const { isBootstrapping, isAuthenticated } = useAuth();

  if (isBootstrapping) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>正在加载账本</Text></View>;
  }

  return isAuthenticated ? <AppNavigator /> : <LoginScreen />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background },
  loadingText: { color: colors.textMuted, fontSize: 14 },
});
