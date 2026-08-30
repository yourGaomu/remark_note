import { request } from './httpClient';
import { AccountType } from '../types/domain';
import type {
  Account,
  AuthResponse,
  CreateAccountInput,
  CreateCategoryInput,
  CreateTransactionInput,
  Transaction,
  TransactionCategory,
  TransactionListQuery,
  TransactionPage,
  TransactionStatistic,
  TransactionStatisticTrend,
  TransactionDailyAmount,
  TransactionTag,
  TransactionTagGroup,
  UserBasicInfo,
} from '../types/domain';

const amountFactor = 100;

export const ezBookkeepingApi = {
  login(loginName: string, password: string): Promise<AuthResponse> {
    return request({
      url: '/authorize.json',
      method: 'POST',
      data: { loginName, password },
      headers: { Authorization: '' },
    });
  },

  logout(): Promise<boolean> {
    return request({ url: '/logout.json', method: 'GET' });
  },

  getProfile(): Promise<UserBasicInfo> {
    return request({ url: '/v1/users/profile/get.json', method: 'GET' });
  },

  getAccounts(visibleOnly = true): Promise<Account[]> {
    return request({ url: `/v1/accounts/list.json?visible_only=${visibleOnly}`, method: 'GET' });
  },

  createAccount(input: CreateAccountInput): Promise<Account> {
    const name = input.name.trim();

    return request({
      url: '/v1/accounts/add.json',
      method: 'POST',
      data: {
        name,
        category: input.category,
        type: AccountType.SingleAccount,
        icon: '1',
        iconType: 0,
        color: '0F8B7D',
        currency: input.currency,
        balance: '0',
        balanceTime: 0,
        comment: input.comment?.trim() || '',
        clientSessionId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
    });
  },

  hideAccount(id: string, hidden: boolean): Promise<boolean> {
    return request({
      url: '/v1/accounts/hide.json',
      method: 'POST',
      data: { id, hidden },
    });
  },

  deleteAccount(id: string): Promise<boolean> {
    return request({
      url: '/v1/accounts/delete.json',
      method: 'POST',
      data: { id },
    });
  },

  getCategories(): Promise<Record<number, TransactionCategory[]>> {
    return request({ url: '/v1/transaction/categories/list.json', method: 'GET' });
  },

  createCategory(input: CreateCategoryInput): Promise<TransactionCategory> {
    return request({
      url: '/v1/transaction/categories/add.json',
      method: 'POST',
      data: {
        name: input.name.trim(),
        type: input.type,
        parentId: input.parentId || '0',
        icon: '1',
        iconType: 0,
        color: '0F8B7D',
        comment: input.comment?.trim() || '',
        clientSessionId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
    });
  },

  hideCategory(id: string, hidden: boolean): Promise<boolean> {
    return request({
      url: '/v1/transaction/categories/hide.json',
      method: 'POST',
      data: { id, hidden },
    });
  },

  deleteCategory(id: string): Promise<boolean> {
    return request({
      url: '/v1/transaction/categories/delete.json',
      method: 'POST',
      data: { id },
    });
  },

  getTransactions(queryOrPage: TransactionListQuery | number = {}, legacyKeyword = ''): Promise<TransactionPage> {
    const query: TransactionListQuery = typeof queryOrPage === 'number'
      ? { page: queryOrPage, keyword: legacyKeyword }
      : queryOrPage;
    const params = createTransactionQueryParams(query, {
      maxTime: query.maxTime ?? 0,
      minTime: query.minTime ?? 0,
      count: query.count ?? 30,
      page: query.page ?? 1,
      withCount: query.withCount ?? true,
    });

    return request({ url: `/v1/transactions/list.json?${params.toString()}`, method: 'GET' });
  },

  getAllTransactions(query: TransactionListQuery = {}): Promise<Transaction[]> {
    const params = createTransactionQueryParams(query, {
      startTime: toUnixSeconds(query.minTime),
      endTime: toUnixSeconds(query.maxTime),
    });

    return request({ url: `/v1/transactions/list/all.json?${params.toString()}`, method: 'GET' });
  },

  getTransactionsByMonth(year: number, month: number, query: TransactionListQuery = {}): Promise<TransactionPage> {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      ...transactionFilterParams(query),
    });

    return request({ url: `/v1/transactions/list/by_month.json?${params.toString()}`, method: 'GET' });
  },

  getTransactionTagGroups(): Promise<TransactionTagGroup[]> {
    return request({ url: '/v1/transaction/tags/groups/list.json', method: 'GET' });
  },

  createTransactionTagGroup(name: string): Promise<TransactionTagGroup> {
    return request({ url: '/v1/transaction/tags/groups/add.json', method: 'POST', data: { name: name.trim() } });
  },

  modifyTransactionTagGroup(id: string, name: string): Promise<TransactionTagGroup> {
    return request({ url: '/v1/transaction/tags/groups/modify.json', method: 'POST', data: { id, name: name.trim() } });
  },

  deleteTransactionTagGroup(id: string): Promise<boolean> {
    return request({ url: '/v1/transaction/tags/groups/delete.json', method: 'POST', data: { id } });
  },

  getTransactionTags(): Promise<TransactionTag[]> {
    return request({ url: '/v1/transaction/tags/list.json', method: 'GET' });
  },

  createTransactionTag(name: string, groupId = '0'): Promise<TransactionTag> {
    return request({ url: '/v1/transaction/tags/add.json', method: 'POST', data: { name: name.trim(), groupId } });
  },

  modifyTransactionTag(id: string, name: string, groupId: string): Promise<TransactionTag> {
    return request({ url: '/v1/transaction/tags/modify.json', method: 'POST', data: { id, name: name.trim(), groupId } });
  },

  hideTransactionTag(id: string, hidden: boolean): Promise<boolean> {
    return request({ url: '/v1/transaction/tags/hide.json', method: 'POST', data: { id, hidden } });
  },

  deleteTransactionTag(id: string): Promise<boolean> {
    return request({ url: '/v1/transaction/tags/delete.json', method: 'POST', data: { id } });
  },

  getStatistics(startTime: number, endTime: number): Promise<TransactionStatistic> {
    const params = new URLSearchParams({
      start_time: String(startTime),
      end_time: String(endTime),
      tag_filter: '',
      keyword: '',
      match_mode: '0',
      use_transaction_timezone: 'false',
    });

    return request({ url: `/v1/transactions/statistics.json?${params.toString()}`, method: 'GET' });
  },

  getStatisticsTrends(startYearMonth: string, endYearMonth: string): Promise<TransactionStatisticTrend[]> {
    const params = new URLSearchParams({
      start_year_month: startYearMonth,
      end_year_month: endYearMonth,
      tag_filter: '',
      keyword: '',
      match_mode: '0',
      use_transaction_timezone: 'false',
    });
    return request({ url: `/v1/transactions/statistics/trends.json?${params.toString()}`, method: 'GET' });
  },

  getDailyAmounts(startTime: number, endTime: number): Promise<TransactionDailyAmount[]> {
    const params = new URLSearchParams({ start_time: String(startTime), end_time: String(endTime), use_transaction_timezone: 'false' });
    return request({ url: `/v1/transactions/amounts/daily.json?${params.toString()}`, method: 'GET' });
  },

  createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const now = new Date();
    const amount = Math.round(input.amount * amountFactor);
    const isTransfer = input.type === 4;
    const destinationAmount = isTransfer
      ? Math.round((input.destinationAmount ?? input.amount) * amountFactor)
      : 0;

    return request({
      url: '/v1/transactions/add.json',
      method: 'POST',
      data: {
        type: input.type,
        categoryId: input.categoryId,
        time: Math.floor(now.getTime() / 1000),
        utcOffset: -now.getTimezoneOffset(),
        sourceAccountId: input.sourceAccountId,
        destinationAccountId: isTransfer ? input.destinationAccountId ?? '0' : '0',
        sourceAmount: amount,
        destinationAmount,
        hideAmount: false,
        tagIds: [],
        pictureIds: [],
        comment: input.comment,
        clientSessionId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
    });
  },
};

function toUnixSeconds(transactionTime?: number): number {
  return transactionTime && transactionTime > 0 ? Math.floor(transactionTime / 1000) : 0;
}

/**
 * Build the query fields used by the server transaction list APIs.
 *
 * Keep these names and values in sync with src/lib/services.ts in the web
 * client. In particular, max_time/min_time on the paged endpoint are
 * transaction-time sequence IDs (milliseconds), while start_time/end_time on
 * the all endpoint are Unix seconds.
 */
function createTransactionQueryParams(
  query: TransactionListQuery,
  paging: { maxTime?: number; minTime?: number; count?: number; page?: number; withCount?: boolean; startTime?: number; endTime?: number } = {},
): URLSearchParams {
  return new URLSearchParams({
    ...transactionFilterParams(query),
    ...(paging.maxTime !== undefined ? { max_time: String(paging.maxTime) } : {}),
    ...(paging.minTime !== undefined ? { min_time: String(paging.minTime) } : {}),
    ...(paging.count !== undefined ? { count: String(paging.count) } : {}),
    ...(paging.page !== undefined ? { page: String(paging.page) } : {}),
    ...(paging.withCount !== undefined ? { with_count: String(paging.withCount) } : {}),
    ...(paging.startTime !== undefined ? { start_time: String(paging.startTime) } : {}),
    ...(paging.endTime !== undefined ? { end_time: String(paging.endTime) } : {}),
  });
}

function transactionFilterParams(query: TransactionListQuery): Record<string, string> {
  return {
    type: String(query.type ?? 0),
    category_ids: query.categoryIds ?? '',
    account_ids: query.accountIds ?? '',
    tag_filter: query.tagFilter ?? '',
    amount_filter: query.amountFilter ?? '',
    keyword: query.keyword ?? '',
    match_mode: String(query.matchMode ?? 0),
    must_have_pictures: String(query.mustHavePictures ?? false),
    with_pictures: 'false',
    // The web client requests complete related objects, which the mobile row
    // needs for category/account names and currency formatting.
    trim_account: 'true',
    trim_category: 'true',
    trim_tag: 'true',
  };
}
