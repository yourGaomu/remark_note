import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/layout';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({ children, ...props }: PropsWithChildren<ScrollViewProps>) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...props}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function ScreenHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle | ViewStyle[] }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function IconCircle({ name, color = colors.primary, backgroundColor = colors.surfaceMuted, size = 20 }: {
  name: IconName;
  color?: string;
  backgroundColor?: string;
  size?: number;
}) {
  return (
    <View style={[styles.iconCircle, { backgroundColor }]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

export function PrimaryButton({ title, loading, disabled, ...props }: PressableProps & {
  title: string;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryButton,
        (disabled || loading) && styles.primaryButtonDisabled,
        pressed && styles.pressed,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{title}</Text>}
    </Pressable>
  );
}

export function StateMessage({ loading, error, empty, onRetry }: {
  loading?: boolean;
  error?: string;
  empty?: string;
  onRetry?: () => void;
}) {
  if (loading) {
    return <ActivityIndicator style={styles.state} size="large" color={colors.primary} />;
  }
  if (error) {
    return (
      <View style={styles.state}>
        <IconCircle name="cloud-offline-outline" color={colors.expense} backgroundColor={colors.dangerSurface} />
        <Text style={styles.stateText}>{error}</Text>
        {onRetry ? <Pressable onPress={onRetry}><Text style={styles.retry}>重新加载</Text></Pressable> : null}
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.state}>
        <IconCircle name="receipt-outline" />
        <Text style={styles.stateText}>{empty}</Text>
      </View>
    );
  }
  return null;
}

export function SettingsRow({ icon, title, value, danger, onPress }: {
  icon: IconName;
  title: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  const foreground = danger ? colors.expense : colors.text;
  return (
    <Pressable style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={danger ? colors.expense : colors.primary} />
      <Text style={[styles.settingsTitle, { color: foreground }]}>{title}</Text>
      {value ? <Text style={styles.settingsValue}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screen: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { flex: 1 },
  headerTitle: { color: colors.text, fontSize: 26, fontWeight: '700' },
  headerSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xxs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 2,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  state: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  stateText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  retry: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
  settingsRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsTitle: { flex: 1, fontSize: 16, fontWeight: '500' },
  settingsValue: { color: colors.textMuted, fontSize: 14 },
});
