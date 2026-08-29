import { TransactionType, type Transaction } from '../../core/types/domain';

const amountFactor = 100;

export function formatMoney(
  minorAmount: string | number,
  currency = 'CNY',
  showSign = false,
): string {
  const value = Number(minorAmount) / amountFactor;
  const formatter = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formatted = formatter.format(Number.isFinite(value) ? value : 0);
  return showSign && value > 0 ? `+${formatted}` : formatted;
}

export function formatTransactionAmount(transaction: Transaction): string {
  const currency = transaction.sourceAccount?.currency ?? 'CNY';
  const amount = formatMoney(transaction.sourceAmount, currency);

  if (transaction.type === TransactionType.Income) {
    return `+${amount}`;
  }
  if (transaction.type === TransactionType.Expense) {
    return `-${amount}`;
  }
  return amount;
}

export function transactionTitle(transaction: Transaction): string {
  if (transaction.comment.trim()) {
    return transaction.comment.trim();
  }
  return transaction.category?.name || (transaction.type === TransactionType.Transfer ? '账户转账' : '未分类交易');
}

export function formatTransactionDate(unixSeconds: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(unixSeconds * 1000));
}

export function currentMonthRange(): { startTime: number; endTime: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    startTime: Math.floor(start.getTime() / 1000),
    endTime: Math.floor(end.getTime() / 1000) - 1,
  };
}
