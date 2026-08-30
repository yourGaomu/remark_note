import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ezBookkeepingApi } from '../../core/api/ezBookkeepingApi';
import { CategoryType } from '../../core/types/domain';
import { Card, Screen, ScreenHeader, SectionTitle, StateMessage } from '../../shared/components/ui';
import { useAsyncResource } from '../../shared/hooks/useAsyncResource';
import { colors } from '../../shared/theme/colors';
import { radius, spacing } from '../../shared/theme/layout';
import { currentMonthRange, formatMoney } from '../../shared/utils/format';
import { TransactionRow } from '../transactions/TransactionRow';

export function DashboardScreen() {
  const loader = useCallback(async () => {
    const range = currentMonthRange();
    const now = new Date();
    const dailyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const dailyEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const [accounts, transactionPage, statistics, categories, dailyAmounts] = await Promise.all([
      ezBookkeepingApi.getAccounts(),
      ezBookkeepingApi.getTransactions({ page: 1, count: 50, withCount: true }),
      ezBookkeepingApi.getStatistics(range.startTime, range.endTime),
      ezBookkeepingApi.getCategories(),
      ezBookkeepingApi.getDailyAmounts(Math.floor(dailyStart.getTime() / 1000), Math.floor(dailyEnd.getTime() / 1000) - 1),
    ]);
    const transactions = transactionPage.items;
    const balance = accounts.flatMap((account) => account.subAccounts?.length ? account.subAccounts : [account])
      .reduce((total, account) => total + Number(account.balance || 0), 0);
    const categoryTypes = Object.values(categories).flatMap((items) => items.flatMap((item) => [item, ...(item.subCategories ?? [])])).reduce<Record<string, number>>((map, item) => ({ ...map, [item.id]: item.type }), {});
    const income = statistics.items.filter((item) => categoryTypes[item.categoryId] === CategoryType.Income).reduce((total, item) => total + Math.abs(Number(item.amount || 0)), 0);
    const expense = statistics.items.filter((item) => categoryTypes[item.categoryId] === CategoryType.Expense).reduce((total, item) => total + Math.abs(Number(item.amount || 0)), 0);
    const dayBuckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
      const day = dailyAmounts.find((item) => item.date === `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
      const incomeForDay = day?.amounts.reduce((sum, amount) => sum + Number(amount.incomeAmount || 0), 0) ?? 0;
      const expenseForDay = day?.amounts.reduce((sum, amount) => sum + Number(amount.expenseAmount || 0), 0) ?? 0;
      return { label: `${date.getMonth() + 1}/${date.getDate()}`, income: incomeForDay, expense: expenseForDay };
    });
    return { balance, income, expense, net: income - expense, transactions: transactions.slice(0, 8), dayBuckets };
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

          <Card style={styles.trendCard}>
            <View style={styles.trendHeader}><Text style={styles.trendTitle}>近七日收支</Text><Text style={[styles.netValue, { color: resource.data.net >= 0 ? colors.income : colors.expense }]}>{resource.data.net >= 0 ? '+' : '-'}{formatMoney(Math.abs(resource.data.net))}</Text></View>
            <View style={styles.chart}>{resource.data.dayBuckets.map((day) => { const max = Math.max(day.income, day.expense, 1); return <View key={day.label} style={styles.chartColumn}><View style={styles.barPair}><View style={[styles.chartBar, { height: Math.max(4, day.income / max * 62), backgroundColor: colors.income }]} /><View style={[styles.chartBar, { height: Math.max(4, day.expense / max * 62), backgroundColor: colors.expense }]} /></View><Text style={styles.chartLabel}>{day.label}</Text></View>; })}</View>
            <View style={styles.chartLegend}><Text style={styles.legendIncome}>收入</Text><Text style={styles.legendExpense}>支出</Text></View>
          </Card>

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
  trendCard: { paddingBottom: spacing.sm },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trendTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  netValue: { fontSize: 14, fontWeight: '700' },
  chart: { height: 94, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', marginTop: spacing.md },
  chartColumn: { alignItems: 'center', gap: 5 },
  barPair: { height: 70, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  chartBar: { width: 6, borderRadius: 3 },
  chartLabel: { color: colors.textMuted, fontSize: 10 },
  chartLegend: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center', marginTop: spacing.xs },
  legendIncome: { color: colors.income, fontSize: 11 },
  legendExpense: { color: colors.expense, fontSize: 11 },
});
