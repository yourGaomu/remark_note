import { useCallback } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ezBookkeepingApi } from '../../core/api/ezBookkeepingApi';
import { Card, Screen, ScreenHeader, SectionTitle, StateMessage } from '../../shared/components/ui';
import { useAsyncResource } from '../../shared/hooks/useAsyncResource';
import { colors } from '../../shared/theme/colors';
import { radius, spacing } from '../../shared/theme/layout';
import { currentMonthRange, formatMoney } from '../../shared/utils/format';

const chartColors = [colors.primary, colors.expense, colors.warning, colors.income, '#7F8C8D'];

export function StatisticsScreen() {
  const loader = useCallback(async () => {
    const range = currentMonthRange();
    const [statistics, categories] = await Promise.all([
      ezBookkeepingApi.getStatistics(range.startTime, range.endTime),
      ezBookkeepingApi.getCategories(),
    ]);
    const categoryMap = Object.values(categories).flatMap((items) => items.flatMap((item) => [item, ...(item.subCategories ?? [])]))
      .reduce<Record<string, string>>((map, item) => ({ ...map, [item.id]: item.name }), {});
    const items = statistics.items
      .map((item) => ({ name: categoryMap[item.categoryId] || '其他', amount: Math.abs(Number(item.amount || 0)) }))
      .sort((a, b) => b.amount - a.amount);
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    return { items, total };
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
            <View style={styles.legend}><View style={styles.legendDot} /><Text style={styles.legendText}>按分类汇总</Text></View>
          </Card>
          <SectionTitle title="分类排行" />
          <Card style={styles.listCard}>
            {resource.data.items.length ? resource.data.items.slice(0, 8).map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.rankRow}>
                <View style={[styles.rank, { backgroundColor: chartColors[index % chartColors.length] }]}><Text style={styles.rankText}>{index + 1}</Text></View>
                <View style={styles.rankContent}>
                  <View style={styles.rankHeader}><Text style={styles.rankName}>{item.name}</Text><Text style={styles.rankAmount}>{formatMoney(item.amount)}</Text></View>
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

const styles = StyleSheet.create({
  totalCard: { minHeight: 155, alignItems: 'center', justifyContent: 'center' },
  totalLabel: { color: colors.textMuted, fontSize: 14 },
  totalAmount: { color: colors.text, fontSize: 31, fontWeight: '800', marginTop: spacing.sm },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  legendText: { color: colors.textMuted, fontSize: 12 },
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
