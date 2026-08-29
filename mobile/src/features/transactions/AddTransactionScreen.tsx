import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ezBookkeepingApi } from '../../core/api/ezBookkeepingApi';
import { CategoryType, TransactionType, type Account, type TransactionCategory } from '../../core/types/domain';
import { Card, PrimaryButton, Screen, ScreenHeader, StateMessage } from '../../shared/components/ui';
import { colors } from '../../shared/theme/colors';
import { radius, spacing } from '../../shared/theme/layout';
import { formatMoney } from '../../shared/utils/format';
import type { RootStackParamList } from '../../application/navigation/types';
import { useAuth } from '../../core/auth/AuthProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTransaction'>;

export function AddTransactionScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<TransactionType>(TransactionType.Expense);
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string>();
  const [optionsRetryKey, setOptionsRetryKey] = useState(0);
  const [picker, setPicker] = useState<'account' | 'destinationAccount' | 'category'>();

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);
    setOptionsError(undefined);
    void Promise.all([ezBookkeepingApi.getAccounts(), ezBookkeepingApi.getCategories()]).then(([loadedAccounts, groupedCategories]) => {
      if (!active) return;
      const flattenedAccounts = loadedAccounts.flatMap((account) => account.subAccounts?.length ? account.subAccounts : [account]);
      const categoryType = type === TransactionType.Income
        ? CategoryType.Income
        : type === TransactionType.Transfer
          ? CategoryType.Transfer
          : CategoryType.Expense;
      const loadedCategories = groupedCategories[categoryType] ?? [];
      const preferredSourceAccountId = accountId || user?.defaultAccountId || flattenedAccounts[0]?.id || '';
      setAccounts(flattenedAccounts);
      setCategories(loadedCategories);
      setAccountId((current) => current || preferredSourceAccountId);
      setDestinationAccountId((current) => current && current !== preferredSourceAccountId
        ? current
        : flattenedAccounts.find((account) => account.id !== preferredSourceAccountId)?.id || '');
      setCategoryId((current) => loadedCategories.some((category) => category.id === current || category.subCategories?.some((item) => item.id === current))
        ? current
        : flattenCategories(loadedCategories)[0]?.id || '');
    }).catch((caught) => {
      if (active) setOptionsError(caught instanceof Error ? caught.message : '账户和分类加载失败');
    }).finally(() => {
      if (active) setLoadingOptions(false);
    });
    return () => { active = false; };
  }, [type, user?.defaultAccountId, optionsRetryKey]);

  async function submit(): Promise<void> {
    const numericAmount = Number(amount);
    const sourceAccountId = accountId || accounts[0]?.id;
    const selectedCategoryId = categoryId || flattenCategories(categories)[0]?.id;
    const targetAccountId = destinationAccountId || accounts.find((account) => account.id !== sourceAccountId)?.id;

    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !sourceAccountId || !selectedCategoryId
      || (type === TransactionType.Transfer && (!targetAccountId || targetAccountId === sourceAccountId))) {
      Alert.alert('信息不完整', '请输入金额，并确保已有账户和分类');
      return;
    }

    setLoading(true);
    try {
      await ezBookkeepingApi.createTransaction({
        type,
        categoryId: selectedCategoryId,
        sourceAccountId,
        destinationAccountId: type === TransactionType.Transfer ? targetAccountId : '0',
        amount: numericAmount,
        destinationAmount: type === TransactionType.Transfer ? numericAmount : 0,
        comment,
      });
      Alert.alert('已保存', `交易金额 ${formatMoney(Math.round(numericAmount * 100))}`, [{ text: '确定', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="新增交易" action={<Pressable onPress={() => navigation.goBack()} hitSlop={12}><Ionicons name="close" size={25} color={colors.text} /></Pressable>} />
      <View style={styles.segment}>
        {[
          ['支出', TransactionType.Expense, colors.expense],
          ['收入', TransactionType.Income, colors.income],
          ['转账', TransactionType.Transfer, colors.primary],
        ].map(([label, value, color]) => (
          <Pressable key={String(value)} onPress={() => setType(value as TransactionType)} style={[styles.segmentItem, type === value && { backgroundColor: color as string }]}>
            <Text style={[styles.segmentText, type === value && styles.segmentTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.amountBox}>
        <Text style={styles.currency}>¥</Text>
        <TextInput style={styles.amountInput} placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      </View>
      <StateMessage loading={loadingOptions} error={optionsError} onRetry={() => setOptionsRetryKey((value) => value + 1)} />
      <Card style={styles.formCard}>
        <FormRow icon="restaurant-outline" label="选择分类" value={findCategoryName(categories, categoryId)} onPress={() => setPicker('category')} />
        <FormRow icon="wallet-outline" label="选择账户" value={accounts.find((item) => item.id === accountId)?.name} onPress={() => setPicker('account')} />
        {type === TransactionType.Transfer ? (
          <FormRow
            icon="swap-horizontal-outline"
            label="选择转入账户"
            value={accounts.find((item) => item.id === destinationAccountId)?.name}
            onPress={() => setPicker('destinationAccount')}
          />
        ) : null}
        <FormRow icon="calendar-outline" label="今天" />
        <View style={styles.noteRow}><Ionicons name="document-text-outline" size={22} color={colors.textMuted} /><TextInput style={styles.noteInput} placeholder="备注" placeholderTextColor={colors.textMuted} value={comment} onChangeText={setComment} /></View>
      </Card>
      <PrimaryButton title="保存交易" loading={loading} onPress={() => void submit()} />
      <SelectionSheet
        visible={picker === 'account'}
        title="选择账户"
        items={accounts.map((item) => ({ id: item.id, label: item.name, description: item.currency }))}
        selectedId={accountId}
        onClose={() => setPicker(undefined)}
        onSelect={(id) => {
          setAccountId(id);
          if (id === destinationAccountId) {
            setDestinationAccountId(accounts.find((account) => account.id !== id)?.id || '');
          }
          setPicker(undefined);
        }}
      />
      <SelectionSheet
        visible={picker === 'destinationAccount'}
        title="选择转入账户"
        items={accounts.filter((item) => item.id !== accountId).map((item) => ({ id: item.id, label: item.name, description: item.currency }))}
        selectedId={destinationAccountId}
        onClose={() => setPicker(undefined)}
        onSelect={(id) => { setDestinationAccountId(id); setPicker(undefined); }}
      />
      <SelectionSheet
        visible={picker === 'category'}
        title="选择分类"
        items={flattenCategories(categories).map((item) => ({ id: item.id, label: item.name, description: item.parentId !== '0' ? '子分类' : '' }))}
        selectedId={categoryId}
        onClose={() => setPicker(undefined)}
        onSelect={(id) => { setCategoryId(id); setPicker(undefined); }}
      />
    </Screen>
  );
}

function flattenCategories(categories: TransactionCategory[]): TransactionCategory[] {
  return categories.flatMap((category) => [category, ...(category.subCategories ?? [])]);
}

function findCategoryName(categories: TransactionCategory[], id: string): string | undefined {
  return flattenCategories(categories).find((category) => category.id === id)?.name;
}

function FormRow({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress?: () => void }) {
  return <Pressable style={({ pressed }) => [styles.formRow, pressed && { opacity: 0.65 }]} onPress={onPress}><Ionicons name={icon} size={22} color={colors.textMuted} /><Text style={[styles.formLabel, !value && styles.placeholder]}>{value || label}</Text><Ionicons name="chevron-forward" size={19} color={colors.textMuted} /></Pressable>;
}

function SelectionSheet({ visible, title, items, selectedId, onClose, onSelect }: {
  visible: boolean;
  title: string;
  items: { id: string; label: string; description: string }[];
  selectedId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHead}><Text style={styles.sheetTitle}>{title}</Text><Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetList}>
            {items.length ? items.map((item) => (
              <Pressable key={item.id} style={styles.choice} onPress={() => onSelect(item.id)}>
                <View style={styles.choiceCopy}><Text style={styles.choiceLabel}>{item.label}</Text>{item.description ? <Text style={styles.choiceDescription}>{item.description}</Text> : null}</View>
                {item.id === selectedId ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
              </Pressable>
            )) : <Text style={styles.noChoices}>暂无可选项，请先在 Web 端创建账户或分类。</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.surface },
  segmentItem: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  segmentText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  segmentTextActive: { color: '#FFFFFF' },
  amountBox: { minHeight: 142, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  currency: { color: colors.text, fontSize: 35, fontWeight: '700', marginRight: spacing.xs },
  amountInput: { minWidth: 180, color: colors.text, fontSize: 46, fontWeight: '700', padding: 0 },
  formCard: { paddingVertical: 0 },
  formRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  formLabel: { flex: 1, color: colors.text, fontSize: 16 },
  placeholder: { color: colors.textMuted },
  noteRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  noteInput: { flex: 1, color: colors.text, fontSize: 16 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  sheet: { maxHeight: '68%', backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  sheetHead: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  sheetList: { paddingTop: spacing.sm },
  choice: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  choiceCopy: { flex: 1 },
  choiceLabel: { color: colors.text, fontSize: 16, fontWeight: '600' },
  choiceDescription: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  noChoices: { color: colors.textMuted, paddingVertical: spacing.xl, textAlign: 'center' },
});
