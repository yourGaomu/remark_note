import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { useCallback, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ezBookkeepingApi } from '../../core/api/ezBookkeepingApi';
import { AccountCategory, type Account } from '../../core/types/domain';
import { useAuth } from '../../core/auth/AuthProvider';
import { Card, IconCircle, PrimaryButton, Screen, ScreenHeader, SectionTitle, StateMessage } from '../../shared/components/ui';
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

const accountCategoryOptions: { value: AccountCategory; label: string }[] = [
  { value: AccountCategory.Cash, label: '现金' },
  { value: AccountCategory.CheckingAccount, label: '银行卡' },
  { value: AccountCategory.SavingsAccount, label: '储蓄账户' },
  { value: AccountCategory.CreditCard, label: '信用卡' },
  { value: AccountCategory.Virtual, label: '虚拟账户' },
  { value: AccountCategory.Debt, label: '负债' },
  { value: AccountCategory.Receivables, label: '应收款' },
  { value: AccountCategory.Investment, label: '投资账户' },
  { value: AccountCategory.CertificateOfDeposit, label: '定期存款' },
];

function groupIcon(category: number): keyof typeof Ionicons.glyphMap {
  if (category === 1) return 'wallet-outline';
  if (category === 3 || category === 5) return 'card-outline';
  if (category === 7) return 'trending-up-outline';
  return 'business-outline';
}

export function AccountsScreen() {
  const { user } = useAuth();
  const [createVisible, setCreateVisible] = useState(false);
  const loader = useCallback(() => ezBookkeepingApi.getAccounts(false), []);
  const resource = useAsyncResource(loader, [loader]);
  const allAccounts = resource.data?.flatMap((account) => account.subAccounts?.length ? account.subAccounts : [account]) ?? [];
  const assets = allAccounts.filter((account) => account.isAsset !== false).reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const liabilities = allAccounts.filter((account) => account.isLiability).reduce((sum, account) => sum + Math.abs(Number(account.balance || 0)), 0);

  async function hideOrDeleteAccount(account: Account): Promise<void> {
    Alert.alert('账户操作', account.hidden ? '显示这个账户，还是删除它？' : '隐藏这个账户，还是删除它？', [
      { text: '取消', style: 'cancel' },
      {
        text: account.hidden ? '显示' : '隐藏',
        onPress: () => void ezBookkeepingApi.hideAccount(account.id, !account.hidden).then(resource.reload).catch((error) => Alert.alert('操作失败', error instanceof Error ? error.message : '请稍后重试')),
      },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => Alert.alert('确认删除', `确定删除“${account.name}”吗？`, [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: () => void ezBookkeepingApi.deleteAccount(account.id).then(resource.reload).catch((error) => Alert.alert('删除失败', error instanceof Error ? error.message : '请稍后重试')),
          },
        ]),
      },
    ]);
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.reload} tintColor={colors.primary} />}>
      <ScreenHeader title="账户" subtitle="管理资产、现金和负债" action={<Pressable accessibilityLabel="新增账户" accessibilityRole="button" onPress={() => setCreateVisible(true)} hitSlop={10}><Ionicons name="add-circle-outline" size={25} color={colors.primary} /></Pressable>} />
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
                {(group.subAccounts?.length ? group.subAccounts : [group]).map((account) => <AccountRow key={account.id} account={account} onMenu={() => void hideOrDeleteAccount(account)} />)}
              </Card>
            </View>
          )) : <StateMessage empty="还没有账户，请先在 Web 端创建账户" />}
        </>
      ) : null}
      <AccountCreateModal currency={user?.defaultCurrency || 'CNY'} visible={createVisible} onClose={() => setCreateVisible(false)} onCreated={() => { setCreateVisible(false); void resource.reload(); }} />
    </Screen>
  );
}

function AccountRow({ account, onMenu }: { account: Account; onMenu: () => void }) {
  const liability = Boolean(account.isLiability);
  const color = liability ? colors.expense : account.color || colors.income;
  return (
    <View style={[styles.accountRow, account.hidden && styles.hiddenRow]}>
      <IconCircle name={groupIcon(account.category)} color={color} backgroundColor={`${color}18`} />
      <View style={styles.accountCopy}><Text style={styles.accountName}>{account.name}</Text><Text style={styles.accountType}>{groupNames[account.category] || '账户'} · {account.currency}</Text></View>
      <Text style={[styles.accountAmount, liability && { color: colors.expense }]}>{formatMoney(account.balance, account.currency)}</Text>
      <Pressable accessibilityLabel={`操作：${account.name}`} accessibilityRole="button" onPress={onMenu} hitSlop={10}><Ionicons name="ellipsis-vertical" size={19} color={colors.textMuted} /></Pressable>
    </View>
  );
}

function AccountCreateModal({ currency, visible, onClose, onCreated }: { currency: string; visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AccountCategory>(AccountCategory.Cash);
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('信息不完整', '请输入账户名称');
      return;
    }

    setSaving(true);
    try {
      await ezBookkeepingApi.createAccount({ name: trimmedName, category, currency });
      setName('');
      setCategory(AccountCategory.Cash);
      onCreated();
    } catch (error) {
      Alert.alert('创建失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>新增账户</Text><Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View>
          <TextInput autoFocus style={styles.sheetInput} placeholder="账户名称" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} maxLength={64} />
          <Text style={styles.sheetLabel}>账户类型</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionList}>
            {accountCategoryOptions.map((option) => (
              <Pressable key={option.value} style={[styles.option, option.value === category && styles.optionSelected]} onPress={() => setCategory(option.value)}>
                <Text style={[styles.optionText, option.value === category && styles.optionTextSelected]}>{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <PrimaryButton title="创建账户" loading={saving} onPress={() => void save()} />
        </View>
      </View>
    </Modal>
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
  hiddenRow: { opacity: 0.55 },
  accountCopy: { flex: 1, minWidth: 0 },
  accountName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  accountType: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  accountAmount: { color: colors.text, fontSize: 14, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg, gap: spacing.sm },
  sheetHeader: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '700' },
  sheetInput: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, color: colors.text, fontSize: 16 },
  sheetLabel: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
  optionList: { gap: spacing.xs, paddingVertical: spacing.xs },
  option: { minHeight: 38, borderWidth: 1, borderColor: colors.border, borderRadius: 19, justifyContent: 'center', paddingHorizontal: spacing.md },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { color: colors.textMuted, fontSize: 13 },
  optionTextSelected: { color: '#FFFFFF', fontWeight: '700' },
});
