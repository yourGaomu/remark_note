import { Alert, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../core/auth/AuthProvider';
import { Card, IconCircle, Screen, ScreenHeader, SettingsRow } from '../../shared/components/ui';
import { colors } from '../../shared/theme/colors';
import { spacing } from '../../shared/theme/layout';

export function SettingsScreen() {
  const { user, logout } = useAuth();

  function confirmLogout(): void {
    Alert.alert('退出登录', '确定要退出当前账号吗？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <Screen>
      <ScreenHeader title="设置" subtitle="管理偏好和账号安全" />
      <Card style={styles.profile}>
        <IconCircle name="person" size={25} color="#FFFFFF" backgroundColor={colors.income} />
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>{user?.nickname || user?.username || '个人资料'}</Text>
          <Text style={styles.profileEmail}>{user?.email || '未设置邮箱'}</Text>
        </View>
      </Card>
      <Card style={styles.group}>
        <SettingsRow icon="cash-outline" title="默认货币" value={user?.defaultCurrency || 'CNY'} />
        <SettingsRow icon="language-outline" title="语言" value="简体中文" />
      </Card>
      <Card style={styles.group}>
        <SettingsRow icon="folder-outline" title="分类管理" onPress={() => Alert.alert('分类管理', '该页面将在下一阶段接入')} />
        <SettingsRow icon="download-outline" title="数据导出" onPress={() => Alert.alert('数据导出', '该功能将在下一阶段接入')} />
      </Card>
      <Card style={styles.group}>
        <SettingsRow icon="shield-checkmark-outline" title="安全设置" onPress={() => Alert.alert('安全设置', '安全设置将在下一阶段接入')} />
        <SettingsRow icon="color-palette-outline" title="主题" value="跟随系统" />
      </Card>
      <Card style={styles.group}>
        <SettingsRow icon="information-circle-outline" title="关于 ezBookkeeping" value="1.0.0" />
      </Card>
      <Card style={styles.group}>
        <SettingsRow icon="log-out-outline" title="退出登录" danger onPress={confirmLogout} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 84 },
  profileCopy: { flex: 1 },
  profileName: { color: colors.text, fontSize: 18, fontWeight: '700' },
  profileEmail: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xxs },
  group: { paddingVertical: 0 },
});
