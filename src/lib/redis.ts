import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Cache TTL in seconds
export const CACHE_TTL = {
  DASHBOARD: 60 * 2,       // 2 minutes
  USER_PROFILE: 60 * 5,    // 5 minutes
  CATEGORIES: 60 * 10,     // 10 minutes
  LIST_DATA: 60 * 2,       // 2 minutes (expenses, incomes, etc.)
  BALANCE: 60 * 2,         // 2 minutes
  TEMPLATES: 60 * 10,      // 10 minutes
  PAYMENTS: 60 * 2,        // 2 minutes
} as const;

// Map query operation names to cache TTLs
const CACHEABLE_QUERIES: Record<string, number> = {
  GetDashboard: CACHE_TTL.DASHBOARD,
  GetMe: CACHE_TTL.USER_PROFILE,
  GetCategories: CACHE_TTL.CATEGORIES,
  GetIncomeCategories: CACHE_TTL.CATEGORIES,
  GetExpenses: CACHE_TTL.LIST_DATA,
  GetIncomes: CACHE_TTL.LIST_DATA,
  GetInstallments: CACHE_TTL.LIST_DATA,
  GetDebts: CACHE_TTL.LIST_DATA,
  GetRecurringIncomes: CACHE_TTL.LIST_DATA,
  GetExpenseTemplateGroups: CACHE_TTL.TEMPLATES,
  GetBalance: CACHE_TTL.BALANCE,
  GetUpcomingPayments: CACHE_TTL.PAYMENTS,
  GetActualPayments: CACHE_TTL.PAYMENTS,
};

// Map mutation names to query caches that should be invalidated
const INVALIDATION_MAP: Record<string, string[]> = {
  // Expense mutations
  CreateExpense: ["GetExpenses", "GetDashboard", "GetBalance", "GetCategories"],
  UpdateExpense: ["GetExpenses", "GetDashboard", "GetBalance", "GetCategories"],
  DeleteExpense: ["GetExpenses", "GetDashboard", "GetBalance", "GetCategories"],
  // Category mutations
  CreateCategory: ["GetCategories"],
  UpdateCategory: ["GetCategories", "GetExpenses"],
  DeleteCategory: ["GetCategories", "GetExpenses"],
  // Installment mutations
  CreateInstallment: ["GetInstallments", "GetDashboard", "GetBalance", "GetUpcomingPayments", "GetActualPayments"],
  UpdateInstallment: ["GetInstallments", "GetDashboard", "GetBalance", "GetUpcomingPayments", "GetActualPayments"],
  DeleteInstallment: ["GetInstallments", "GetDashboard", "GetBalance", "GetUpcomingPayments", "GetActualPayments"],
  RecordInstallmentPayment: ["GetInstallments", "GetDashboard", "GetBalance", "GetUpcomingPayments", "GetActualPayments"],
  MarkInstallmentComplete: ["GetInstallments", "GetDashboard", "GetBalance", "GetUpcomingPayments", "GetActualPayments"],
  // Debt mutations
  CreateDebt: ["GetDebts", "GetDashboard", "GetBalance", "GetUpcomingPayments", "GetActualPayments"],
  UpdateDebt: ["GetDebts", "GetDashboard", "GetBalance", "GetUpcomingPayments", "GetActualPayments"],
  DeleteDebt: ["GetDebts", "GetDashboard", "GetBalance", "GetUpcomingPayments", "GetActualPayments"],
  RecordDebtPayment: ["GetDebts", "GetDashboard", "GetBalance", "GetUpcomingPayments", "GetActualPayments"],
  MarkDebtComplete: ["GetDebts", "GetDashboard", "GetBalance", "GetUpcomingPayments", "GetActualPayments"],
  // Income mutations
  CreateIncome: ["GetIncomes", "GetDashboard", "GetBalance"],
  UpdateIncome: ["GetIncomes", "GetDashboard", "GetBalance"],
  DeleteIncome: ["GetIncomes", "GetDashboard", "GetBalance"],
  CreateIncomeCategory: ["GetIncomeCategories"],
  UpdateIncomeCategory: ["GetIncomeCategories", "GetIncomes"],
  DeleteIncomeCategory: ["GetIncomeCategories", "GetIncomes"],
  // Recurring income
  CreateRecurringIncome: ["GetRecurringIncomes"],
  UpdateRecurringIncome: ["GetRecurringIncomes"],
  DeleteRecurringIncome: ["GetRecurringIncomes"],
  CreateIncomeFromRecurring: ["GetIncomes", "GetDashboard", "GetBalance", "GetRecurringIncomes"],
  // Expense templates
  CreateExpenseTemplateGroup: ["GetExpenseTemplateGroups"],
  UpdateExpenseTemplateGroup: ["GetExpenseTemplateGroups"],
  DeleteExpenseTemplateGroup: ["GetExpenseTemplateGroups"],
  AddExpenseTemplateItem: ["GetExpenseTemplateGroups"],
  UpdateExpenseTemplateItem: ["GetExpenseTemplateGroups"],
  DeleteExpenseTemplateItem: ["GetExpenseTemplateGroups"],
  CreateExpensesFromTemplateGroup: ["GetExpenses", "GetDashboard", "GetBalance", "GetCategories"],
  // Profile
  UpdateProfile: ["GetMe"],
  ChangePassword: [],
  Enable2FA: ["GetMe"],
  Disable2FA: ["GetMe"],
  DeleteAccount: [],
};

export function getCacheTTL(operationName: string): number | null {
  return CACHEABLE_QUERIES[operationName] ?? null;
}

export function getInvalidationKeys(operationName: string): string[] {
  return INVALIDATION_MAP[operationName] ?? [];
}

export function buildCacheKey(userId: string, operationName: string, variables?: Record<string, unknown>): string {
  const varsKey = variables && Object.keys(variables).length > 0
    ? `:${JSON.stringify(variables)}`
    : "";
  return `gql:${userId}:${operationName}${varsKey}`;
}
