import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ezBookkeepingApi } from '../../core/api/ezBookkeepingApi';
import { getUpdateIdentity } from '../../core/update/updateService';
import { CategoryType, TransactionType, type Account, type Transaction, type TransactionCategory, type TransactionListQuery, type TransactionTag } from '../../core/types/domain';
import { Screen, ScreenHeader, StateMessage, Card } from '../../shared/components/ui';
import { colors } from '../../shared/theme/colors';
import { radius, spacing } from '../../shared/theme/layout';
import { TransactionRow } from './TransactionRow';

// The server accepts at most 50 items per page. Use the same page size as the
// dashboard request so both screens exercise an identical first-page query.
const PAGE_SIZE = 50;
type Filters = { type: number; categoryId: string; accountId: string; tagId: string; amountMin: string; amountMax: string; dateRange: '' | 'month' | 'lastMonth' | 'year' };
const EMPTY_FILTERS: Filters = { type: 0, categoryId: '', accountId: '', tagId: '', amountMin: '', amountMax: '', dateRange: '' };

interface TransactionListState {
  items: Transaction[];
  totalCount: number;
  cursor?: number;
}

const EMPTY_LIST: TransactionListState = { items: [], totalCount: 0 };

export function TransactionsScreen() {
  const [keyword, setKeyword] = useState('');
  const [queryKeyword, setQueryKeyword] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);
  const [list, setList] = useState<TransactionListState>(EMPTY_LIST);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [options, setOptions] = useState<{ accounts: Account[]; categories: TransactionCategory[]; tags: TransactionTag[] }>();
  const [optionsError, setOptionsError] = useState<string>();
  const isFocused = useIsFocused();
  const requestSerial = useRef(0);
  const cursorRef = useRef<number | undefined>(undefined);
  const updateIdentity = getUpdateIdentity();

  const flattenedAccounts = useMemo(() => options?.accounts.flatMap((account) => account.subAccounts?.length ? account.subAccounts : [account]) ?? [], [options]);
  const flattenedCategories = useMemo(() => options?.categories.flatMap((category) => [category, ...(category.subCategories ?? [])]) ?? [], [options]);

  const buildQuery = useCallback((cursor?: number): TransactionListQuery => {
    const dateQuery = getDateQuery(filters.dateRange);
    return {
      page: 1,
      count: PAGE_SIZE,
      minTime: dateQuery.minTime,
      maxTime: cursor ? Math.min(cursor, dateQuery.maxTime || Number.MAX_SAFE_INTEGER) : dateQuery.maxTime,
      type: filters.type,
      categoryIds: filters.categoryId,
      accountIds: filters.accountId,
      tagFilter: filters.tagId ? (filters.tagId === 'none' ? 'none' : `0:${filters.tagId}`) : '',
      amountFilter: makeAmountFilter(filters),
      keyword: queryKeyword,
      withCount: !cursor,
    };
  }, [filters, queryKeyword]);

  const fetchPage = useCallback(async (cursor?: number): Promise<TransactionListState> => {
    const query = buildQuery(cursor);
    let result = await ezBookkeepingApi.getTransactions(query);

    // Keep compatibility with deployments where the cursor endpoint returns
    // an empty page while the all/month endpoints still contain data.
    if (!cursor && result.items.length === 0) {
      const fallbackItems = await ezBookkeepingApi.getAllTransactions(query);
      if (fallbackItems.length > 0) {
        result = { items: fallbackItems, totalCount: fallbackItems.length };
      } else {
        const month = getFallbackMonth(filters.dateRange);
        if (month) {
          const monthResult = await ezBookkeepingApi.getTransactionsByMonth(month.year, month.month, query);
          if (monthResult.items.length > 0) {
            result = monthResult;
          }
        }
      }
    }

    const items = Array.isArray(result.items) ? result.items : [];
    return {
      items,
      totalCount: result.totalCount ?? items.length,
      cursor: normalizeCursor(result.nextTimeSequenceId),
    };
  }, [buildQuery, filters.dateRange]);

  const loadFirstPage = useCallback(async (): Promise<void> => {
    const serial = ++requestSerial.current;
    cursorRef.current = undefined;
    setLoading(true);
    setError(undefined);
    setList(EMPTY_LIST);
    try {
      const result = await fetchPage();
      if (serial !== requestSerial.current) {
        return;
      }
      cursorRef.current = result.cursor;
      setList(result);
    } catch (caught) {
      if (serial === requestSerial.current) {
        setError(caught instanceof Error ? caught.message : '交易加载失败');
      }
    } finally {
      if (serial === requestSerial.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [fetchPage]);

  const loadMore = useCallback(async (): Promise<void> => {
    const cursor = cursorRef.current;
    if (!cursor || loading || loadingMore || (list.totalCount > 0 && list.items.length >= list.totalCount)) {
      return;
    }
    const serial = ++requestSerial.current;
    setLoadingMore(true);
    try {
      const result = await fetchPage(cursor);
      if (serial !== requestSerial.current) {
        return;
      }
      cursorRef.current = result.cursor;
      setList((current) => ({
        items: mergeTransactions(current.items, result.items),
        totalCount: current.totalCount || result.totalCount,
        cursor: result.cursor,
      }));
    } catch (caught) {
      if (serial === requestSerial.current) {
        setError(caught instanceof Error ? caught.message : '交易加载失败');
      }
    } finally {
      if (serial === requestSerial.current) {
        setLoadingMore(false);
      }
    }
  }, [fetchPage, list.items.length, list.totalCount, loading, loadingMore]);

  useEffect(() => {
    if (isFocused) {
      void loadFirstPage();
    }
  }, [isFocused, loadFirstPage]);
  useEffect(() => {
    let active = true;
    void Promise.all([ezBookkeepingApi.getAccounts(false), ezBookkeepingApi.getCategories(), ezBookkeepingApi.getTransactionTags()]).then(([accounts, groupedCategories, tags]) => {
      if (active) setOptions({ accounts, categories: Object.values(groupedCategories).flat(), tags });
    }).catch((caught) => { if (active) setOptionsError(caught instanceof Error ? caught.message : '筛选项加载失败'); });
    return () => { active = false; };
  }, []);

  const hasMore = Boolean(list.cursor) && (list.totalCount === 0 || list.items.length < list.totalCount);
  const activeFilterCount = countActiveFilters(filters);
  // Clone the filter object so applying an unchanged selection still refreshes the list.
  const applyFilters = () => { setFilters({ ...draftFilters }); setFilterVisible(false); };
  const resetFilters = () => { setDraftFilters({ ...EMPTY_FILTERS }); setFilters({ ...EMPTY_FILTERS }); setFilterVisible(false); };

  return <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadFirstPage(); }} tintColor={colors.primary} />}>
    <ScreenHeader title="交易明细" subtitle={list.totalCount ? `共 ${list.totalCount} 笔交易 · v${updateIdentity.appVersion}` : `按时间查看全部收支记录 · v${updateIdentity.appVersion}`} action={<Pressable accessibilityLabel="筛选交易" accessibilityRole="button" onPress={() => { setDraftFilters(filters); setFilterVisible(true); }}><View><Ionicons name="filter-outline" size={23} color={colors.text} />{activeFilterCount ? <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View> : null}</View></Pressable>} />
    <View style={styles.searchRow}><Ionicons name="search-outline" size={21} color={colors.textMuted} /><TextInput style={styles.searchInput} placeholder="搜索交易" placeholderTextColor={colors.textMuted} value={keyword} onChangeText={setKeyword} onSubmitEditing={() => setQueryKeyword(keyword.trim())} returnKeyType="search" />{keyword ? <Pressable onPress={() => { setKeyword(''); setQueryKeyword(''); }}><Ionicons name="close-circle" size={19} color={colors.textMuted} /></Pressable> : null}</View>
    {(activeFilterCount || queryKeyword) ? <View style={styles.activeFilters}><Text style={styles.activeFilterText}>{queryKeyword ? `关键词：${queryKeyword}` : ''}{activeFilterCount ? `${queryKeyword ? '  ·  ' : ''}${activeFilterCount} 项筛选` : ''}</Text><Pressable onPress={resetFilters}><Text style={styles.clearText}>清除筛选</Text></Pressable></View> : null}
    <StateMessage loading={loading} error={error} onRetry={() => void loadFirstPage()} />
    {!loading && !error && !list.items.length ? <StateMessage empty={queryKeyword || activeFilterCount ? '没有匹配的交易' : '还没有交易记录'} /> : null}
    {list.items.length ? <Card style={styles.listCard}>{list.items.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}</Card> : null}
    {hasMore ? <Pressable style={styles.loadMore} disabled={loadingMore} onPress={() => void loadMore()}>{loadingMore ? <ActivityIndicator color={colors.primary} /> : <><Text style={styles.loadMoreText}>加载更多</Text><Ionicons name="chevron-down" size={17} color={colors.primary} /></>}</Pressable> : null}
    {!loading && list.items.length > 0 && !hasMore ? <Text style={styles.endText}>已显示全部交易</Text> : null}
    {optionsError ? <Text style={styles.optionsError}>{optionsError}</Text> : null}
    <FilterModal visible={filterVisible} filters={draftFilters} accounts={flattenedAccounts} categories={flattenedCategories} tags={options?.tags ?? []} onChange={setDraftFilters} onClose={() => setFilterVisible(false)} onReset={resetFilters} onApply={applyFilters} />
  </Screen>;
}

function mergeTransactions(current: Transaction[], incoming: Transaction[]): Transaction[] { const seen = new Set(current.map((item) => item.id)); return [...current, ...incoming.filter((item) => !seen.has(item.id))]; }
function makeAmountFilter(filters: Filters): string {
  const min = parseAmountInput(filters.amountMin);
  const max = parseAmountInput(filters.amountMax);
  if (min && max) return `bt:${min}:${max}`;
  if (min) return `gt:${min}`;
  if (max) return `lt:${max}`;
  return '';
}
function parseAmountInput(value: string): string { const amount = Number(value.trim()); return Number.isFinite(amount) && amount >= 0 ? String(Math.round(amount * 100)) : ''; }

function countActiveFilters(filters: Filters): number {
  return [
    Number(filters.type ?? 0) !== 0,
    Boolean(filters.categoryId),
    Boolean(filters.accountId),
    Boolean(filters.tagId),
    Boolean(filters.amountMin.trim()),
    Boolean(filters.amountMax.trim()),
    Boolean(filters.dateRange),
  ].filter(Boolean).length;
}

function normalizeCursor(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const cursor = Number(value);
  return Number.isSafeInteger(cursor) && cursor > 0 ? cursor : undefined;
}

function getFallbackMonth(range: Filters['dateRange']): { year: number; month: number } | undefined {
  if (range === 'year') {
    return undefined;
  }
  const now = new Date();
  const offset = range === 'lastMonth' ? -1 : 0;
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function FilterModal({ visible, filters, accounts, categories, tags, onChange, onClose, onReset, onApply }: { visible: boolean; filters: Filters; accounts: Account[]; categories: TransactionCategory[]; tags: TransactionTag[]; onChange: (filters: Filters) => void; onClose: () => void; onReset: () => void; onApply: () => void }) {
  const categoryOptions = categories.filter((category) => filters.type === 0 || (filters.type === TransactionType.Income && category.type === CategoryType.Income) || (filters.type === TransactionType.Expense && category.type === CategoryType.Expense) || (filters.type === TransactionType.Transfer && category.type === CategoryType.Transfer));
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={styles.sheet}><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>筛选交易</Text><Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
    <Text style={styles.filterLabel}>时间范围</Text><ChipRow items={[['全部', ''], ['本月', 'month'], ['上月', 'lastMonth'], ['今年', 'year']]} selected={filters.dateRange} onSelect={(value) => update({ dateRange: value as Filters['dateRange'] })} />
    <Text style={styles.filterLabel}>交易类型</Text><ChipRow items={[['全部', 0], ['支出', TransactionType.Expense], ['收入', TransactionType.Income], ['转账', TransactionType.Transfer]]} selected={filters.type} onSelect={(value) => update({ type: Number(value), categoryId: '' })} />
    <Text style={styles.filterLabel}>分类</Text><ChipRow items={[['全部', ''], ...categoryOptions.map((item) => [item.name, item.id] as [string, string])]} selected={filters.categoryId} onSelect={(value) => update({ categoryId: String(value) })} />
    <Text style={styles.filterLabel}>账户</Text><ChipRow items={[['全部', ''], ...accounts.map((item) => [item.name, item.id] as [string, string])]} selected={filters.accountId} onSelect={(value) => update({ accountId: String(value) })} />
    <Text style={styles.filterLabel}>标签</Text><ChipRow items={[['全部', ''], ['无标签', 'none'], ...tags.filter((tag) => !tag.hidden).map((tag) => [tag.name, tag.id] as [string, string])]} selected={filters.tagId} onSelect={(value) => update({ tagId: String(value) })} />
    <Text style={styles.filterLabel}>金额范围（元）</Text><View style={styles.amountInputs}><TextInput style={styles.amountInput} keyboardType="decimal-pad" placeholder="最低金额" placeholderTextColor={colors.textMuted} value={filters.amountMin} onChangeText={(value) => update({ amountMin: value })} /><Text style={styles.amountDash}>至</Text><TextInput style={styles.amountInput} keyboardType="decimal-pad" placeholder="最高金额" placeholderTextColor={colors.textMuted} value={filters.amountMax} onChangeText={(value) => update({ amountMax: value })} /></View>
  </ScrollView><View style={styles.sheetActions}><Pressable style={styles.resetButton} onPress={onReset}><Text style={styles.resetText}>重置</Text></Pressable><Pressable style={styles.applyButton} onPress={onApply}><Text style={styles.applyText}>应用筛选</Text></Pressable></View></View></View></Modal>;
}

function ChipRow({ items, selected, onSelect }: { items: [string, string | number][]; selected: string | number; onSelect: (value: string | number) => void }) { return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{items.map(([label, value]) => <Pressable key={String(value)} style={[styles.chip, String(selected) === String(value) && styles.chipSelected]} onPress={() => onSelect(value)}><Text style={[styles.chipText, String(selected) === String(value) && styles.chipTextSelected]}>{label}</Text></Pressable>)}</ScrollView>; }

function getDateQuery(range: Filters['dateRange']): { minTime: number; maxTime: number } {
  if (!range) return { minTime: 0, maxTime: 0 };
  const now = new Date();
  const start = range === 'year' ? new Date(now.getFullYear(), 0, 1) : new Date(now.getFullYear(), now.getMonth() + (range === 'lastMonth' ? -1 : 0), 1);
  const end = range === 'year' ? new Date(now.getFullYear() + 1, 0, 1) : new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { minTime: Math.floor(start.getTime() / 1000) * 1000, maxTime: Math.floor(end.getTime() / 1000) * 1000 - 1 };
}

const styles = StyleSheet.create({
  searchRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: spacing.sm }, listCard: { paddingVertical: 0 },
  filterBadge: { position: 'absolute', top: -7, right: -9, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.expense, alignItems: 'center', justifyContent: 'center' }, filterBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  activeFilters: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, activeFilterText: { flex: 1, color: colors.textMuted, fontSize: 12 }, clearText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  loadMore: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface }, loadMoreText: { color: colors.primary, fontSize: 14, fontWeight: '700' }, endText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: spacing.xs }, optionsError: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.35)' }, sheet: { maxHeight: '86%', backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg }, sheetHeader: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '700' }, filterContent: { paddingBottom: spacing.md }, filterLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.xs }, chips: { gap: spacing.xs, paddingVertical: 2 }, chip: { minHeight: 36, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.md, backgroundColor: colors.background }, chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary }, chipText: { color: colors.textMuted, fontSize: 13 }, chipTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  amountInputs: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, amountInput: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, color: colors.text, paddingHorizontal: spacing.sm, fontSize: 14 }, amountDash: { color: colors.textMuted }, sheetActions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, resetButton: { flex: 1, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, resetText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' }, applyButton: { flex: 2, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, applyText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
