// ── Enums ────────────────────────────────────────────────────────────────────

export type Plan = 'FREE' | 'PREMIUM';
export type TransactionType = 'INCOME' | 'EXPENSE';

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: Plan;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  createdAt: string;
}

// ── Categories ───────────────────────────────────────────────────────────────

export interface CategoryResponse {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  userId: string | null;
  createdAt: string;
}

export interface CreateCategoryDto {
  name: string;
  icon?: string;
  color?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  icon?: string;
  color?: string;
}

// ── Transactions ─────────────────────────────────────────────────────────────

export interface CategorySummary {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface TransactionResponse {
  id: string;
  amount: string;
  type: TransactionType;
  description: string | null;
  date: string;
  categoryId: string;
  category: CategorySummary;
  userId: string;
  createdAt: string;
}

export interface CreateTransactionDto {
  amount: number;
  type: TransactionType;
  description?: string;
  date: string;
  categoryId: string;
}

export interface UpdateTransactionDto {
  amount?: number;
  type?: TransactionType;
  description?: string;
  date?: string;
  categoryId?: string;
}

export interface TransactionFilters {
  month?: number;
  year?: number;
  type?: TransactionType;
  categoryId?: string;
  page?: number;
  limit?: number;
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export interface GoalResponse {
  id: string;
  amount: string;
  month: number;
  year: number;
  categoryId: string;
  category: CategorySummary;
  spent: string;
  notified: boolean;
  createdAt: string;
}

export interface CreateGoalDto {
  amount: number;
  month: number;
  year: number;
  categoryId: string;
}

export interface UpdateGoalDto {
  amount?: number;
}

// ── Summary ───────────────────────────────────────────────────────────────────

export interface SummaryResult {
  month: number;
  year: number;
  income: string;
  expenses: string;
  balance: string;
  transactionCount: number;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// ── Billing ───────────────────────────────────────────────────────────────────

export interface CheckoutResponse {
  url: string;
}
