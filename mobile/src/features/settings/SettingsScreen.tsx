import { Alert, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { useAuth } from '../../core/auth/AuthProvider';
import { checkAndApplyUpdate } from '../../core/update/updateService';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, IconCircle, Screen, ScreenHeader, SettingsRow } from '../../shared/components/ui';
import { colors } from '../../shared/theme/colors';
import { spacing } from '../../shared/theme/layout';
import type { RootStackParamList } from '../../application/navigation/types';

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  async function checkForUpdates(): Promise<void> {
    if (checkingUpdates) {
      return;
    }

    setCheckingUpdates(true);
    try {
      const outcome = await checkAndApplyUpdate();

      if (outcome === 'disabled') {
        Alert.alert('暂不可检查', '当前开发环境未启用 OTA 更新，请安装正式构建版本后再试。');
      } else if (outcome === 'current') {
        Alert.alert('已是最新版本', '当前应用已经是最新版本。');
      }
    } catch (error) {
      Alert.alert('检查更新失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setCheckingUpdates(false);
    }
  }

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
        <SettingsRow icon="folder-outline" title="分类管理" onPress={() => navigation.navigate('Categories')} />
        <SettingsRow icon="download-outline" title="数据导出" onPress={() => Alert.alert('数据导出', '该功能将在下一阶段接入')} />
      </Card>
      <Card style={styles.group}>
        <SettingsRow icon="shield-checkmark-outline" title="安全设置" onPress={() => Alert.alert('安全设置', '安全设置将在下一阶段接入')} />
        <SettingsRow icon="color-palette-outline" title="主题" value="跟随系统" />
        <SettingsRow icon="cloud-download-outline" title="检查更新" loading={checkingUpdates} onPress={() => void checkForUpdates()} />
      </Card>
      <Card style={styles.group}>
        <SettingsRow icon="information-circle-outline" title="关于 ezBookkeeping" value="1.0.1" />
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
