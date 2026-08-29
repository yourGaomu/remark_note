import { request } from './httpClient';
import type {
  Account,
  AuthResponse,
  CreateTransactionInput,
  Transaction,
  TransactionCategory,
  TransactionPage,
  TransactionStatistic,
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

  getAccounts(): Promise<Account[]> {
    return request({ url: '/v1/accounts/list.json?visible_only=true', method: 'GET' });
  },

  getCategories(): Promise<Record<number, TransactionCategory[]>> {
    return request({ url: '/v1/transaction/categories/list.json', method: 'GET' });
  },

  getTransactions(page = 1, keyword = ''): Promise<TransactionPage> {
    const params = new URLSearchParams({
      max_time: '0',
      min_time: '0',
      type: '0',
      category_ids: '',
      account_ids: '',
      tag_filter: '',
      amount_filter: '',
      keyword,
      match_mode: '0',
      must_have_pictures: 'false',
      count: '30',
      page: String(page),
      with_count: 'true',
      with_pictures: 'false',
      trim_account: 'true',
      trim_category: 'true',
      trim_tag: 'true',
    });

    return request({ url: `/v1/transactions/list.json?${params.toString()}`, method: 'GET' });
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
