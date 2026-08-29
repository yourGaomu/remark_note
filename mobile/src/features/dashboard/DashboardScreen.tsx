import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ezBookkeepingApi } from '../../core/api/ezBookkeepingApi';
import { TransactionType } from '../../core/types/domain';
import { Card, Screen, ScreenHeader, SectionTitle, StateMessage } from '../../shared/components/ui';
import { useAsyncResource } from '../../shared/hooks/useAsyncResource';
import { colors } from '../../shared/theme/colors';
import { radius, spacing } from '../../shared/theme/layout';
import { formatMoney } from '../../shared/utils/format';
import { TransactionRow } from '../transactions/TransactionRow';

export function DashboardScreen() {
  const loader = useCallback(async () => {
    const [accounts, transactionPage] = await Promise.all([
      ezBookkeepingApi.getAccounts(),
      ezBookkeepingApi.getTransactions(1),
    ]);
    const transactions = transactionPage.items;
    const balance = accounts.flatMap((account) => account.subAccounts?.length ? account.subAccounts : [account])
      .reduce((total, account) => total + Number(account.balance || 0), 0);
    const now = new Date();
    const monthly = transactions.filter((item) => {
      const date = new Date(item.time * 1000);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
    const income = monthly.filter((item) => item.type === TransactionType.Income)
      .reduce((total, item) => total + item.sourceAmount, 0);
    const expense = monthly.filter((item) => item.type === TransactionType.Expense)
      .reduce((total, item) => total + item.sourceAmount, 0);
    return { balance, income, expense, transactions: transactions.slice(0, 5) };
  }, []);
  const resource = useAsyncResource(loader, [loader]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.reload} tintColor={colors.primary} />}>
      <ScreenHeader
        title="财务概览"
        subtitle={new Intl.DateTimeFormat('zh-CN', { dateStyle: 'full' }).format(new Date())}
        action={<View style={styles.avatar}><Ionicons name="person" size={19} color="#FFFFFF" /></View>}
      />
      <StateMessage loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      {resource.data ? (
        <>
          <View style={styles.balanceCard}>
            <View style={styles.balanceLabelRow}>
              <Text style={styles.balanceLabel}>总余额</Text>
              <Ionicons name="eye-outline" size={21} color="rgba(255,255,255,0.78)" />
            </View>
            <Text style={styles.balance}>{formatMoney(resource.data.balance)}</Text>
            <View style={styles.wave} />
          </View>

          <View style={styles.flowGrid}>
            <Card style={styles.flowCard}>
              <Ionicons name="arrow-down-circle" size={29} color={colors.income} />
              <Text style={styles.flowLabel}>本月收入</Text>
              <Text style={[styles.flowValue, { color: colors.income }]}>{formatMoney(resource.data.income)}</Text>
            </Card>
            <Card style={styles.flowCard}>
              <Ionicons name="arrow-up-circle" size={29} color={colors.expense} />
              <Text style={styles.flowLabel}>本月支出</Text>
              <Text style={[styles.flowValue, { color: colors.expense }]}>{formatMoney(resource.data.expense)}</Text>
            </Card>
          </View>

          <SectionTitle title="最近交易" />
          <Card style={styles.transactionCard}>
            {resource.data.transactions.length ? resource.data.transactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            )) : <StateMessage empty="还没有交易记录" />}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  balanceCard: { minHeight: 170, borderRadius: radius.lg, backgroundColor: colors.primary, padding: spacing.lg, overflow: 'hidden' },
  balanceLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 14 },
  balance: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', marginTop: spacing.md },
  wave: { position: 'absolute', left: -20, right: -20, bottom: -55, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.14)' },
  flowGrid: { flexDirection: 'row', gap: spacing.sm },
  flowCard: { flex: 1, gap: spacing.xs },
  flowLabel: { color: colors.textMuted, fontSize: 13 },
  flowValue: { fontSize: 17, fontWeight: '700' },
  transactionCard: { paddingVertical: 0 },
});
