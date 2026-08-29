import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { environment } from '../../config/environment';
import { useAuth } from '../../core/auth/AuthProvider';
import { PrimaryButton } from '../../shared/components/ui';
import { colors } from '../../shared/theme/colors';
import { radius, spacing } from '../../shared/theme/layout';

export function LoginScreen() {
  const { login } = useAuth();
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(): Promise<void> {
    if (!loginName.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      await login(loginName.trim(), password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.brand}>
          <View style={styles.logo}><Ionicons name="analytics" size={38} color="#FFFFFF" /></View>
          <Text style={styles.brandName}>ezBookkeeping</Text>
          <Text style={styles.subtitle}>随时掌握每一笔收支</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>用户名或邮箱</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={21} color={colors.primary} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="请输入用户名或邮箱"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={loginName}
              onChangeText={setLoginName}
            />
          </View>

          <Text style={styles.label}>密码</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={21} color={colors.primary} />
            <TextInput
              placeholder="请输入密码"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!passwordVisible}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={() => void submit()}
            />
            <Pressable onPress={() => setPasswordVisible((value) => !value)} hitSlop={12}>
              <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!environment.isConfigured ? (
            <Text style={styles.configHint}>请先在 mobile/.env.local 配置 EXPO_PUBLIC_EZBK_API_URL</Text>
          ) : null}

          <PrimaryButton title="登录" loading={submitting} onPress={() => void submit()} />
          <Text style={styles.register}>还没有账号？请先通过 Web 端完成注册</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  brand: { alignItems: 'center', marginBottom: 48 },
  logo: { width: 72, height: 72, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandName: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: spacing.md },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  form: { gap: spacing.sm },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: spacing.xs },
  inputRow: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: spacing.sm },
  error: { color: colors.expense, fontSize: 13, lineHeight: 19 },
  configHint: { color: colors.warning, fontSize: 13, lineHeight: 19 },
  register: { color: colors.textMuted, textAlign: 'center', fontSize: 13, marginTop: spacing.xs },
});
