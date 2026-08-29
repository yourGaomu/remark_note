import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { ezBookkeepingApi } from '../../core/api/ezBookkeepingApi';
import { Card, Screen, ScreenHeader, StateMessage } from '../../shared/components/ui';
import { useAsyncResource } from '../../shared/hooks/useAsyncResource';
import { colors } from '../../shared/theme/colors';
import { radius, spacing } from '../../shared/theme/layout';
import { TransactionRow } from './TransactionRow';

export function TransactionsScreen() {
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const loader = useCallback(() => ezBookkeepingApi.getTransactions(1, query), [query]);
  const resource = useAsyncResource(loader, [loader]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.reload} tintColor={colors.primary} />}>
      <ScreenHeader title="交易明细" subtitle="按时间查看全部收支记录" action={<Ionicons name="filter-outline" size={23} color={colors.text} onPress={() => Alert.alert('筛选', '高级筛选将在下一阶段接入')} />} />
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={21} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索交易"
          placeholderTextColor={colors.textMuted}
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={() => setQuery(keyword.trim())}
          returnKeyType="search"
        />
        {keyword ? <Pressable onPress={() => { setKeyword(''); setQuery(''); }}><Ionicons name="close-circle" size={19} color={colors.textMuted} /></Pressable> : null}
      </View>
      <StateMessage loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      {resource.data ? (
        <Card style={styles.listCard}>
          {resource.data.items.length ? resource.data.items.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          )) : <StateMessage empty={query ? '没有匹配的交易' : '还没有交易记录'} />}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: spacing.sm },
  listCard: { paddingVertical: 0 },
});
