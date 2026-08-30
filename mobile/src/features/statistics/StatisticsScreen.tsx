import { useCallback } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ezBookkeepingApi } from '../../core/api/ezBookkeepingApi';
import { CategoryType } from '../../core/types/domain';
import { Card, Screen, ScreenHeader, SectionTitle, StateMessage } from '../../shared/components/ui';
import { useAsyncResource } from '../../shared/hooks/useAsyncResource';
import { colors } from '../../shared/theme/colors';
import { radius, spacing } from '../../shared/theme/layout';
import { currentMonthRange, formatMoney } from '../../shared/utils/format';

const chartColors = [colors.primary, colors.expense, colors.warning, colors.income, '#7F8C8D'];

export function StatisticsScreen() {
  const loader = useCallback(async () => {
    const range = currentMonthRange();
    const now = new Date();
    const [statistics, categories, accounts, trends] = await Promise.all([
      ezBookkeepingApi.getStatistics(range.startTime, range.endTime),
      ezBookkeepingApi.getCategories(),
      ezBookkeepingApi.getAccounts(),
      ezBookkeepingApi.getStatisticsTrends(toYearMonth(now, -5), toYearMonth(now, 0)),
    ]);
    const categoryMap = Object.values(categories).flatMap((items) => items.flatMap((item) => [item, ...(item.subCategories ?? [])]))
      .reduce<Record<string, { name: string; type: number }>>((map, item) => ({ ...map, [item.id]: { name: item.name, type: item.type } }), {});
    const accountMap = accounts.flatMap((account) => account.subAccounts?.length ? account.subAccounts : [account]).reduce<Record<string, string>>((map, item) => ({ ...map, [item.id]: item.name }), {});
    const itemMap = new Map<string, { name: string; amount: number; type: 'income' | 'expense' | 'transfer' }>();
    statistics.items.forEach((item) => {
      const category = categoryMap[item.categoryId];
      const type = category?.type === CategoryType.Income ? 'income' : category?.type === CategoryType.Expense ? 'expense' : 'transfer';
      const key = item.categoryId || item.accountId;
      const previous = itemMap.get(key);
      itemMap.set(key, { name: category?.name || accountMap[item.accountId] || '其他', amount: (previous?.amount ?? 0) + Math.abs(Number(item.amount || 0)), type });
    });
    const items = [...itemMap.values()].sort((a, b) => b.amount - a.amount);
    const total = items.filter((item) => item.type !== 'transfer').reduce((sum, item) => sum + item.amount, 0);
    const income = items.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expense = items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const trendItems = trends.map((trend) => ({ label: `${trend.month}月`, income: trend.items.filter((item) => categoryMap[item.categoryId]?.type === CategoryType.Income).reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0), expense: trend.items.filter((item) => categoryMap[item.categoryId]?.type === CategoryType.Expense).reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0) }));
    return { items, total, income, expense, trendItems };
  }, []);
  const resource = useAsyncResource(loader, [loader]);
  const maxAmount = resource.data?.items[0]?.amount || 1;

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.reload} tintColor={colors.primary} />}>
      <ScreenHeader title="收支统计" subtitle={`${new Date().getFullYear()}年${new Date().getMonth() + 1}月`} />
      <StateMessage loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      {resource.data ? (
        <>
          <Card style={styles.totalCard}>
            <Text style={styles.totalLabel}>本月统计金额</Text>
            <Text style={styles.totalAmount}>{formatMoney(resource.data.total)}</Text>
            <View style={styles.summaryFlow}><View><Text style={styles.flowLabel}>收入</Text><Text style={[styles.flowAmount, { color: colors.income }]}>{formatMoney(resource.data.income)}</Text></View><View><Text style={styles.flowLabel}>支出</Text><Text style={[styles.flowAmount, { color: colors.expense }]}>{formatMoney(resource.data.expense)}</Text></View><View><Text style={styles.flowLabel}>净结余</Text><Text style={[styles.flowAmount, { color: resource.data.income >= resource.data.expense ? colors.income : colors.expense }]}>{resource.data.income >= resource.data.expense ? '+' : '-'}{formatMoney(Math.abs(resource.data.income - resource.data.expense))}</Text></View></View>
          </Card>
          <Card style={styles.trendCard}><Text style={styles.trendTitle}>月度趋势</Text><View style={styles.trendChart}>{resource.data.trendItems.map((item) => { const max = Math.max(item.income, item.expense, 1); return <View key={item.label} style={styles.trendColumn}><View style={styles.trendBars}><View style={[styles.trendBar, { height: Math.max(4, item.income / max * 70), backgroundColor: colors.income }]} /><View style={[styles.trendBar, { height: Math.max(4, item.expense / max * 70), backgroundColor: colors.expense }]} /></View><Text style={styles.trendLabel}>{item.label}</Text></View>; })}</View><View style={styles.legend}><View style={[styles.legendDot, { backgroundColor: colors.income }]} /><Text style={styles.legendText}>收入</Text><View style={[styles.legendDot, { backgroundColor: colors.expense, marginLeft: spacing.sm }]} /><Text style={styles.legendText}>支出</Text></View></Card>
          <SectionTitle title="分类排行" />
          <Card style={styles.listCard}>
            {resource.data.items.length ? resource.data.items.slice(0, 8).map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.rankRow}>
                <View style={[styles.rank, { backgroundColor: chartColors[index % chartColors.length] }]}><Text style={styles.rankText}>{index + 1}</Text></View>
                <View style={styles.rankContent}>
                  <View style={styles.rankHeader}><Text style={styles.rankName}>{item.name}</Text><Text style={[styles.rankAmount, { color: item.type === 'income' ? colors.income : item.type === 'expense' ? colors.expense : colors.primary }]}>{item.type === 'income' ? '+' : item.type === 'expense' ? '-' : ''}{formatMoney(item.amount)}</Text></View>
                  <View style={styles.track}><View style={[styles.bar, { width: `${Math.max(5, item.amount / maxAmount * 100)}%`, backgroundColor: chartColors[index % chartColors.length] }]} /></View>
                </View>
              </View>
            )) : <StateMessage empty="本月还没有可统计的交易" />}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function toYearMonth(date: Date, offset: number): string {
  const value = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  totalCard: { minHeight: 155, alignItems: 'center', justifyContent: 'center' },
  totalLabel: { color: colors.textMuted, fontSize: 14 },
  totalAmount: { color: colors.text, fontSize: 31, fontWeight: '800', marginTop: spacing.sm },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  legendText: { color: colors.textMuted, fontSize: 12 },
  summaryFlow: { flexDirection: 'row', gap: spacing.xxl, marginTop: spacing.md },
  flowLabel: { color: colors.textMuted, fontSize: 12 },
  flowAmount: { fontSize: 15, fontWeight: '700', marginTop: 3 },
  trendCard: { gap: spacing.sm },
  trendTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  trendChart: { height: 102, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  trendColumn: { alignItems: 'center', gap: 5 },
  trendBars: { height: 76, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  trendBar: { width: 7, borderRadius: 3 },
  trendLabel: { color: colors.textMuted, fontSize: 10 },
  listCard: { gap: spacing.md },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rank: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  rankContent: { flex: 1, gap: spacing.xs },
  rankHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  rankName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  rankAmount: { color: colors.text, fontSize: 13 },
  track: { height: 7, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  bar: { height: 7, borderRadius: radius.pill },
});
