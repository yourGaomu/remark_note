import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ezBookkeepingApi } from '../../core/api/ezBookkeepingApi';
import { CategoryType, type TransactionCategory } from '../../core/types/domain';
import { Card, IconCircle, PrimaryButton, Screen, ScreenHeader, StateMessage } from '../../shared/components/ui';
import { useAsyncResource } from '../../shared/hooks/useAsyncResource';
import { colors } from '../../shared/theme/colors';
import { spacing } from '../../shared/theme/layout';
import type { RootStackParamList } from '../../application/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Categories'>;

const categoryTypes: { value: CategoryType; label: string; color: string }[] = [
  { value: CategoryType.Expense, label: '支出', color: colors.expense },
  { value: CategoryType.Income, label: '收入', color: colors.income },
  { value: CategoryType.Transfer, label: '转账', color: colors.primary },
];

export function CategoriesScreen({ navigation }: Props) {
  const [type, setType] = useState<CategoryType>(CategoryType.Expense);
  const [form, setForm] = useState<{ visible: boolean; parentId: string }>({ visible: false, parentId: '0' });
  const loader = useCallback(() => ezBookkeepingApi.getCategories(), []);
  const resource = useAsyncResource(loader, [loader]);
  const categories = resource.data?.[type] ?? [];

  function openCreate(parentId = '0'): void {
    setForm({ visible: true, parentId });
  }

  async function changeVisibility(category: TransactionCategory): Promise<void> {
    try {
      await ezBookkeepingApi.hideCategory(category.id, !category.hidden);
      await resource.reload();
    } catch (error) {
      Alert.alert('操作失败', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  function deleteCategory(category: TransactionCategory): void {
    Alert.alert('确认删除', `确定删除“${category.name}”吗？已使用该分类的交易可能不允许删除。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => void ezBookkeepingApi.deleteCategory(category.id).then(resource.reload).catch((error) => Alert.alert('删除失败', error instanceof Error ? error.message : '请稍后重试')),
      },
    ]);
  }

  function openActions(category: TransactionCategory): void {
    Alert.alert('分类操作', category.hidden ? '显示这个分类，还是删除它？' : '隐藏这个分类，还是删除它？', [
      { text: '取消', style: 'cancel' },
      { text: category.hidden ? '显示' : '隐藏', onPress: () => void changeVisibility(category) },
      { text: '删除', style: 'destructive', onPress: () => deleteCategory(category) },
    ]);
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.reload} tintColor={colors.primary} />}>
      <ScreenHeader title="分类管理" subtitle="管理收入、支出和转账分类" action={<Pressable onPress={() => navigation.goBack()} hitSlop={10}><Ionicons name="close" size={25} color={colors.text} /></Pressable>} />
      <View style={styles.segment}>
        {categoryTypes.map((item) => (
          <Pressable key={item.value} onPress={() => setType(item.value)} style={[styles.segmentItem, type === item.value && { backgroundColor: item.color }]}>
            <Text style={[styles.segmentText, type === item.value && styles.segmentTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <StateMessage loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      {resource.data ? (
        <View style={styles.list}>
          {categories.map((category) => (
            <Card key={category.id} style={category.hidden ? [styles.categoryCard, styles.hiddenCategory] : styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <IconCircle name="folder-open-outline" color={categoryTypes.find((item) => item.value === type)?.color || colors.primary} backgroundColor={colors.surfaceMuted} />
                <Text style={styles.categoryName}>{category.name}</Text>
                <Pressable accessibilityLabel={`操作：${category.name}`} accessibilityRole="button" onPress={() => openActions(category)} hitSlop={10}><Ionicons name="ellipsis-vertical" size={19} color={colors.textMuted} /></Pressable>
              </View>
              {category.subCategories?.map((subCategory) => (
                <View key={subCategory.id} style={[styles.subCategory, subCategory.hidden ? styles.hiddenCategory : undefined]}>
                  <Text style={styles.subCategoryName}>{subCategory.name}</Text>
                  <Pressable accessibilityLabel={`操作：${subCategory.name}`} accessibilityRole="button" onPress={() => openActions(subCategory)} hitSlop={10}><Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} /></Pressable>
                </View>
              ))}
              <Pressable style={styles.addSubCategory} onPress={() => openCreate(category.id)}><Ionicons name="add" size={18} color={colors.primary} /><Text style={styles.addSubCategoryText}>新增子分类</Text></Pressable>
            </Card>
          ))}
          {!categories.length ? <StateMessage empty="暂无分类" /> : null}
          <PrimaryButton title="新增一级分类" onPress={() => openCreate()} />
        </View>
      ) : null}
      <CategoryCreateModal visible={form.visible} type={type} parentId={form.parentId} parents={categories} onClose={() => setForm({ visible: false, parentId: '0' })} onCreated={() => { setForm({ visible: false, parentId: '0' }); void resource.reload(); }} />
    </Screen>
  );
}

function CategoryCreateModal({ visible, type, parentId, parents, onClose, onCreated }: {
  visible: boolean;
  type: CategoryType;
  parentId: string;
  parents: TransactionCategory[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState(parentId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedParentId(parentId);
      setName('');
    }
  }, [parentId, visible]);

  async function save(): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('信息不完整', '请输入分类名称');
      return;
    }

    setSaving(true);
    try {
      await ezBookkeepingApi.createCategory({ name: trimmedName, type, parentId: selectedParentId });
      setName('');
      setSelectedParentId('0');
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
          <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>新增分类</Text><Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View>
          <TextInput autoFocus style={styles.sheetInput} placeholder="分类名称" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} maxLength={64} />
          <Text style={styles.sheetLabel}>归属</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionList}>
            <Pressable style={[styles.option, selectedParentId === '0' && styles.optionSelected]} onPress={() => setSelectedParentId('0')}><Text style={[styles.optionText, selectedParentId === '0' && styles.optionTextSelected]}>一级分类</Text></Pressable>
            {parents.map((parent) => <Pressable key={parent.id} style={[styles.option, selectedParentId === parent.id && styles.optionSelected]} onPress={() => setSelectedParentId(parent.id)}><Text style={[styles.optionText, selectedParentId === parent.id && styles.optionTextSelected]}>{parent.name}</Text></Pressable>)}
          </ScrollView>
          <PrimaryButton title="创建分类" loading={saving} onPress={() => void save()} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.surface },
  segmentItem: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  segmentText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  segmentTextActive: { color: '#FFFFFF' },
  list: { gap: spacing.sm },
  categoryCard: { paddingVertical: spacing.sm },
  hiddenCategory: { opacity: 0.52 },
  categoryHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  categoryName: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  subCategory: { minHeight: 42, marginLeft: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  subCategoryName: { color: colors.textMuted, fontSize: 14 },
  addSubCategory: { minHeight: 40, marginLeft: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  addSubCategoryText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
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
