import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ezBookkeepingApi } from '../../core/api/ezBookkeepingApi';
import type { TransactionTag, TransactionTagGroup } from '../../core/types/domain';
import { Card, IconCircle, PrimaryButton, Screen, ScreenHeader, StateMessage } from '../../shared/components/ui';
import { useAsyncResource } from '../../shared/hooks/useAsyncResource';
import { colors } from '../../shared/theme/colors';
import { radius, spacing } from '../../shared/theme/layout';
import type { RootStackParamList } from '../../application/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Tags'>;
type TagData = { groups: TransactionTagGroup[]; tags: TransactionTag[] };
type TagForm = { visible: boolean; tag?: TransactionTag };
type GroupForm = { visible: boolean; group?: TransactionTagGroup };

const DEFAULT_GROUP_ID = '0';
const DEFAULT_GROUP: TransactionTagGroup = { id: DEFAULT_GROUP_ID, name: '未分组', displayOrder: -1 };

export function TagsScreen({ navigation }: Props) {
  const [activeGroupId, setActiveGroupId] = useState(DEFAULT_GROUP_ID);
  const [tagForm, setTagForm] = useState<TagForm>({ visible: false });
  const [groupForm, setGroupForm] = useState<GroupForm>({ visible: false });
  const loader = useCallback(async (): Promise<TagData> => {
    const [groups, tags] = await Promise.all([
      ezBookkeepingApi.getTransactionTagGroups(),
      ezBookkeepingApi.getTransactionTags(),
    ]);
    return { groups, tags };
  }, []);
  const resource = useAsyncResource(loader, [loader]);
  const groups = useMemo(() => {
    const serverGroups = [...(resource.data?.groups ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
    return [DEFAULT_GROUP, ...serverGroups];
  }, [resource.data?.groups]);
  const tags = useMemo(() => {
    const allTags = resource.data?.tags ?? [];
    return allTags
      .filter((tag) => tag.groupId === activeGroupId)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  }, [activeGroupId, resource.data?.tags]);

  useEffect(() => {
    if (resource.data && !groups.some((group) => group.id === activeGroupId)) {
      setActiveGroupId(groups[0]?.id ?? DEFAULT_GROUP_ID);
    }
  }, [activeGroupId, groups, resource.data]);

  function closeTagForm(): void {
    setTagForm({ visible: false });
  }

  async function toggleTag(tag: TransactionTag): Promise<void> {
    try {
      await ezBookkeepingApi.hideTransactionTag(tag.id, !tag.hidden);
      await resource.reload();
    } catch (error) {
      Alert.alert('操作失败', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  function deleteTag(tag: TransactionTag): void {
    Alert.alert('确认删除', `确定删除“${tag.name}”吗？已使用该标签的交易可能无法删除。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => void ezBookkeepingApi.deleteTransactionTag(tag.id)
          .then(resource.reload)
          .catch((error) => Alert.alert('删除失败', error instanceof Error ? error.message : '请稍后重试')),
      },
    ]);
  }

  function openTagActions(tag: TransactionTag): void {
    Alert.alert('标签操作', tag.hidden ? '显示这个标签，还是删除它？' : '隐藏这个标签，还是删除它？', [
      { text: '取消', style: 'cancel' },
      { text: '编辑', onPress: () => setTagForm({ visible: true, tag }) },
      { text: tag.hidden ? '显示' : '隐藏', onPress: () => void toggleTag(tag) },
      { text: '删除', style: 'destructive', onPress: () => deleteTag(tag) },
    ]);
  }

  function openGroupActions(group: TransactionTagGroup): void {
    if (group.id === DEFAULT_GROUP_ID) {
      Alert.alert('未分组标签', '未分组标签不能重命名或删除。');
      return;
    }

    Alert.alert('标签组操作', '可以重命名或删除这个标签组。', [
      { text: '取消', style: 'cancel' },
      { text: '重命名', onPress: () => setGroupForm({ visible: true, group }) },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => Alert.alert('确认删除', `确定删除“${group.name}”吗？请先移走组内标签。`, [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: () => void ezBookkeepingApi.deleteTransactionTagGroup(group.id)
              .then(async () => { setActiveGroupId(DEFAULT_GROUP_ID); await resource.reload(); })
              .catch((error) => Alert.alert('删除失败', error instanceof Error ? error.message : '请稍后重试')),
          },
        ]),
      },
    ]);
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.refreshing} onRefresh={resource.reload} tintColor={colors.primary} />}>
      <ScreenHeader
        title="标签管理"
        subtitle="用标签整理和筛选交易"
        action={<Pressable accessibilityLabel="关闭标签管理" accessibilityRole="button" onPress={() => navigation.goBack()} hitSlop={10}><Ionicons name="close" size={25} color={colors.text} /></Pressable>}
      />
      <View style={styles.groupHeader}>
        <Text style={styles.sectionLabel}>标签组</Text>
        <View style={styles.groupActions}>
          <Pressable accessibilityLabel="新增标签组" accessibilityRole="button" onPress={() => setGroupForm({ visible: true })} hitSlop={10}><Ionicons name="add-circle-outline" size={23} color={colors.primary} /></Pressable>
          <Pressable accessibilityLabel="标签组操作" accessibilityRole="button" onPress={() => openGroupActions(groups.find((group) => group.id === activeGroupId) ?? DEFAULT_GROUP)} hitSlop={10}><Ionicons name="ellipsis-horizontal-circle-outline" size={23} color={colors.textMuted} /></Pressable>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupList}>
        {groups.map((group) => (
          <Pressable key={group.id} onPress={() => setActiveGroupId(group.id)} style={[styles.groupChip, activeGroupId === group.id && styles.groupChipActive]}>
            <Text numberOfLines={1} style={[styles.groupChipText, activeGroupId === group.id && styles.groupChipTextActive]}>{group.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <StateMessage loading={resource.loading} error={resource.error} onRetry={resource.reload} />
      {resource.data ? (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{groups.find((group) => group.id === activeGroupId)?.name ?? '标签'} <Text style={styles.count}>{tags.length}</Text></Text>
            <Pressable accessibilityLabel="新增标签" accessibilityRole="button" onPress={() => setTagForm({ visible: true })} style={styles.addTagButton}>
              <Ionicons name="add" size={18} color="#FFFFFF" /><Text style={styles.addTagText}>新增标签</Text>
            </Pressable>
          </View>
          <Card style={styles.listCard}>
            {tags.map((tag) => <TagRow key={tag.id} tag={tag} onMenu={() => openTagActions(tag)} />)}
            {!tags.length ? <StateMessage empty="这个标签组还没有标签" /> : null}
          </Card>
        </>
      ) : null}
      <TagModal
        visible={tagForm.visible}
        tag={tagForm.tag}
        groups={groups}
        defaultGroupId={activeGroupId}
        onClose={closeTagForm}
        onSaved={() => { closeTagForm(); void resource.reload(); }}
      />
      <GroupModal
        visible={groupForm.visible}
        group={groupForm.group}
        onClose={() => setGroupForm({ visible: false })}
        onSaved={(group) => { setGroupForm({ visible: false }); setActiveGroupId(group.id); void resource.reload(); }}
      />
    </Screen>
  );
}

function TagRow({ tag, onMenu }: { tag: TransactionTag; onMenu: () => void }) {
  return (
    <View style={[styles.tagRow, tag.hidden && styles.hiddenRow]}>
      <IconCircle name="pricetag-outline" color={tag.hidden ? colors.textMuted : colors.primary} backgroundColor={colors.surfaceMuted} size={19} />
      <View style={styles.tagCopy}><Text style={styles.tagName}>{tag.name}</Text><Text style={styles.tagState}>{tag.hidden ? '已隐藏' : '可用于交易'}</Text></View>
      <Pressable accessibilityLabel={`操作：${tag.name}`} accessibilityRole="button" onPress={onMenu} hitSlop={10}><Ionicons name="ellipsis-vertical" size={19} color={colors.textMuted} /></Pressable>
    </View>
  );
}

function TagModal({ visible, tag, groups, defaultGroupId, onClose, onSaved }: {
  visible: boolean;
  tag?: TransactionTag;
  groups: TransactionTagGroup[];
  defaultGroupId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState(defaultGroupId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(tag?.name ?? '');
      setGroupId(tag?.groupId ?? defaultGroupId);
    }
  }, [defaultGroupId, tag, visible]);

  async function save(): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('信息不完整', '请输入标签名称');
      return;
    }
    setSaving(true);
    try {
      if (tag) await ezBookkeepingApi.modifyTransactionTag(tag.id, trimmedName, groupId);
      else await ezBookkeepingApi.createTransactionTag(trimmedName, groupId);
      onSaved();
    } catch (error) {
      Alert.alert(tag ? '保存失败' : '创建失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={styles.sheet}>
        <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{tag ? '编辑标签' : '新增标签'}</Text><Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View>
        <TextInput autoFocus={!tag} style={styles.sheetInput} placeholder="标签名称" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} maxLength={64} />
        <Text style={styles.sheetLabel}>标签组</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionList}>
          {groups.map((group) => <Pressable key={group.id} style={[styles.option, groupId === group.id && styles.optionSelected]} onPress={() => setGroupId(group.id)}><Text style={[styles.optionText, groupId === group.id && styles.optionTextSelected]}>{group.name}</Text></Pressable>)}
        </ScrollView>
        <PrimaryButton title={tag ? '保存标签' : '创建标签'} loading={saving} onPress={() => void save()} />
      </View></View>
    </Modal>
  );
}

function GroupModal({ visible, group, onClose, onSaved }: { visible: boolean; group?: TransactionTagGroup; onClose: () => void; onSaved: (group: TransactionTagGroup) => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (visible) setName(group?.name ?? ''); }, [group, visible]);

  async function save(): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('信息不完整', '请输入标签组名称');
      return;
    }
    setSaving(true);
    try {
      const saved = group ? await ezBookkeepingApi.modifyTransactionTagGroup(group.id, trimmedName) : await ezBookkeepingApi.createTransactionTagGroup(trimmedName);
      onSaved(saved);
    } catch (error) {
      Alert.alert(group ? '保存失败' : '创建失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={styles.sheet}>
        <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{group ? '重命名标签组' : '新增标签组'}</Text><Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View>
        <TextInput autoFocus style={styles.sheetInput} placeholder="标签组名称" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} maxLength={64} />
        <PrimaryButton title={group ? '保存标签组' : '创建标签组'} loading={saving} onPress={() => void save()} />
      </View></View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  groupHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  groupActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  groupList: { gap: spacing.xs, paddingVertical: 2 },
  groupChip: { minHeight: 40, maxWidth: 150, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' },
  groupChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  groupChipText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  groupChipTextActive: { color: '#FFFFFF' },
  listHeader: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  addTagButton: { minHeight: 38, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary },
  addTagText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  listCard: { paddingVertical: 0 },
  tagRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  hiddenRow: { opacity: 0.55 },
  tagCopy: { flex: 1, minWidth: 0 },
  tagName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  tagState: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
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
