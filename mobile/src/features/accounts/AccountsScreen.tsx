import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { useCallback } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ezBookkeepingApi } from '../../core/api/ezBookkeepingApi';
import type { Account } from '../../core/types/domain';
import { Card, IconCircle, Screen, ScreenHeader, SectionTitle, StateMessage } from '../../shared/components/ui';
import { useAsyncResource } from '../../shared/hooks/useAsyncResource';
import { colors } from '../../shared/theme/colors';
import { spacing } from '../../shared/theme/layout';
import { formatMoney } from '../../shared/utils/format';

const groupNames: Record<number, string> = {
  1: '现金',
  2: '银行卡',
  3: '信用卡',
  4: '虚拟账户',
  5: '负债',
  6: '应收款',
  7: '投资账户',
  8: '储蓄账户',
  9: '定期存款',
};

function groupIcon(category: number): keyof typeof Ionicons.glyphMap {
  if (category === 1) return 'wallet-outline';
  if (category === 3 || category === 5) return 'card-outline';
  if (category === 7) return 'trending-up-outline';
  return 'business-outline';
}

export function AccountsScreen() {
  const loader = useCallback(() => ezBookkeepingApi.getAccounts(), []);
  const resource = useAsyncResource(loader, [loader]);
  const allAccounts = resource.data?.flatMap((account) => account.subAccounts?.length ? account.subAccounts : [account]) ?? [];
  const assets = allAccounts.filter((account) => account.isAsset !== false).reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const liabilities = allAccounts.filter((account) => account.isLiability).reduce((sum, account) => sum + Math.abs(Number(account.balance || 0)), 0);

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.reload} tintColor={colors.primary} />}>
      <ScreenHeader title="账户" subtitle="管理资产、现金和负债" action={<Ionicons name="add-circle-outline" size={25} color={colors.primary} onPress={() => Alert.alert('新增账户', '账户管理将在下一阶段接入')} />} />
      <StateMessage loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      {resource.data ? (
        <>
          <View style={styles.summary}>
            <View><Text style={styles.summaryLabel}>净资产</Text><Text style={styles.summaryAmount}>{formatMoney(assets - liabilities)}</Text></View>
            <IconCircle name="eye-outline" color={colors.primary} backgroundColor="rgba(255,255,255,0.7)" />
          </View>
          {resource.data.length ? resource.data.map((group) => (
            <View key={group.id} style={styles.group}>
              <SectionTitle title={groupNames[group.category] || group.name} action={<Text style={styles.groupBalance}>{formatMoney((group.subAccounts?.length ? group.subAccounts : [group]).reduce((sum, account) => sum + Number(account.balance || 0), 0), group.currency)}</Text>} />
              <Card style={styles.accountCard}>
                {(group.subAccounts?.length ? group.subAccounts : [group]).map((account) => <AccountRow key={account.id} account={account} />)}
              </Card>
            </View>
          )) : <StateMessage empty="还没有账户，请先在 Web 端创建账户" />}
        </>
      ) : null}
    </Screen>
  );
}

function AccountRow({ account }: { account: Account }) {
  const liability = Boolean(account.isLiability);
  const color = liability ? colors.expense : account.color || colors.income;
  return (
    <View style={styles.accountRow}>
      <IconCircle name={groupIcon(account.category)} color={color} backgroundColor={`${color}18`} />
      <View style={styles.accountCopy}><Text style={styles.accountName}>{account.name}</Text><Text style={styles.accountType}>{groupNames[account.category] || '账户'} · {account.currency}</Text></View>
      <Text style={[styles.accountAmount, liability && { color: colors.expense }]}>{formatMoney(account.balance, account.currency)}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { minHeight: 130, borderRadius: 16, backgroundColor: colors.surfaceMuted, padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: colors.textMuted, fontSize: 14 },
  summaryAmount: { color: colors.text, fontSize: 31, fontWeight: '800', marginTop: spacing.sm },
  group: { gap: spacing.sm },
  groupBalance: { color: colors.text, fontSize: 15, fontWeight: '600' },
  accountCard: { paddingVertical: 0 },
  accountRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  accountCopy: { flex: 1, minWidth: 0 },
  accountName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  accountType: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  accountAmount: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
