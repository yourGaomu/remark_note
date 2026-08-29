export interface UserBasicInfo {
  username: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
  avatarProvider?: string;
  defaultCurrency?: string;
  defaultAccountId?: string;
}

export interface AuthResponse {
  token: string;
  need2FA: boolean;
  user?: UserBasicInfo;
}

export interface TokenRefreshResponse {
  newToken?: string;
  user?: UserBasicInfo;
}

export interface Account {
  id: string;
  name: string;
  parentId: string;
  category: number;
  type: number;
  icon: string;
  iconType: number;
  color: string;
  currency: string;
  balance: string;
  isAsset?: boolean;
  isLiability?: boolean;
  hidden: boolean;
  subAccounts?: Account[];
}

export interface TransactionCategory {
  id: string;
  name: string;
  parentId: string;
  type: number;
  icon: string;
  iconType: number;
  color: string;
  hidden: boolean;
  subCategories?: TransactionCategory[];
}

export interface Transaction {
  id: string;
  type: number;
  categoryId: string;
  category?: TransactionCategory;
  time: number;
  utcOffset: number;
  sourceAccountId: string;
  sourceAccount?: Account;
  destinationAccountId: string;
  destinationAccount?: Account;
  sourceAmount: number;
  destinationAmount?: number | null;
  hideAmount: boolean;
  tagIds: string[];
  comment: string;
  editable: boolean;
}

export interface TransactionPage {
  items: Transaction[];
  nextTimeSequenceId?: number;
  totalCount?: number;
}

export interface TransactionStatisticItem {
  categoryId: string;
  accountId: string;
  relatedAccountId?: string;
  amount: string;
}

export interface TransactionStatistic {
  startTime: number;
  endTime: number;
  items: TransactionStatisticItem[];
}

export interface CreateTransactionInput {
  type: TransactionType;
  categoryId: string;
  sourceAccountId: string;
  destinationAccountId?: string;
  amount: number;
  destinationAmount?: number;
  comment: string;
}

export interface CreateAccountInput {
  name: string;
  category: AccountCategory;
  currency: string;
  comment?: string;
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  parentId?: string;
  comment?: string;
}

export enum AccountCategory {
  Cash = 1,
  CheckingAccount = 2,
  CreditCard = 3,
  Virtual = 4,
  Debt = 5,
  Receivables = 6,
  Investment = 7,
  SavingsAccount = 8,
  CertificateOfDeposit = 9,
}

export enum AccountType {
  SingleAccount = 1,
  MultiSubAccounts = 2,
}

export enum TransactionType {
  Income = 2,
  Expense = 3,
  Transfer = 4,
}

export enum CategoryType {
  Income = 1,
  Expense = 2,
  Transfer = 3,
}
