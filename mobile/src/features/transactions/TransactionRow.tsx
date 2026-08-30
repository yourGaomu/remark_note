import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { TransactionType, type Transaction } from '../../core/types/domain';
import { colors } from '../../shared/theme/colors';
import { spacing } from '../../shared/theme/layout';
import { formatTransactionAmount, formatTransactionDate, transactionTitle } from '../../shared/utils/format';

function iconForTransaction(transaction: Transaction): keyof typeof Ionicons.glyphMap {
  if (transaction.type === TransactionType.Income) return 'briefcase-outline';
  if (transaction.type === TransactionType.Transfer) return 'swap-horizontal-outline';
  return 'receipt-outline';
}

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const income = transaction.type === TransactionType.Income;
  const transfer = transaction.type === TransactionType.Transfer;
  const color = income ? colors.income : transfer ? colors.primary : colors.expense;

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={iconForTransaction(transaction)} size={20} color={color} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>{transactionTitle(transaction)}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {transaction.category?.name || '未分类'} · {formatTransactionDate(transaction.time)} · {transaction.sourceAccount?.name || '账户'}
        </Text>
        {transaction.tags?.length ? <View style={styles.tags}>{transaction.tags.slice(0, 3).map((tag) => <Text key={tag.id} style={styles.tag}>#{tag.name}</Text>)}</View> : null}
      </View>
      <Text style={[styles.amount, { color }]}>{formatTransactionAmount(transaction)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  tags: { flexDirection: 'row', gap: 5, marginTop: 4 },
  tag: { color: colors.primaryDark, fontSize: 11 },
  amount: { fontSize: 14, fontWeight: '700' },
});
