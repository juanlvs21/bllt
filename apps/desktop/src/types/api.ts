/**
 * The contract of `window.api`: DTOs and functions the preload exposes.
 * Main implements it, preload forwards it, renderer consumes it.
 */
import type {
  BusinessInputRaw,
  CloudSettingsInput,
  CustomerInput,
  CustomerUpdate,
  DashboardSummary,
  ExportInput,
  ListQuery,
  LoginInput,
  Page,
  PageQueryInput,
  ProductInput,
  ProductUpdate,
  RateConfirmInput,
  RateSource,
  RecoverInput,
  Result,
  Role,
  SaleInput,
  SalesPageQueryInput,
  SalesQuery,
  SaleStatus,
  SetupInputRaw,
  StockAdjust,
  UserCreateInput
} from '@bllt/shared'

export interface SessionUser {
  id: string
  username: string
  role: Role
}

export interface AuthStatus {
  needsSetup: boolean
  user: SessionUser | null
}

export interface SetupResult {
  user: SessionUser
  recoveryCode: string
}

export interface UserDto {
  id: string
  username: string
  role: Role
  active: boolean
  createdAt: string
}

export interface ProductDto {
  id: string
  code: string
  name: string
  stock: number
  costCents: number
  priceCents: number
  active: boolean
  updatedAt: string
}

export interface ProductPage extends Page<ProductDto> {
  /** Stock × cost of every matching product, not just this page. */
  inventoryCents: number
  lowStock: number
}

export interface CustomerDto {
  id: string
  name: string
  document: string | null
  phone: string | null
  createdAt: string
  salesCount: number
  totalCents: number
}

export interface ExchangeRateDto {
  date: string
  bsPerUsd: number
  source: RateSource
  confirmedBy: string
  confirmedAt: string
}

export interface RateSuggestion {
  /** Candidate id from the Worker, or null for a public API quote. */
  candidateId: string | null
  bsPerUsd: number
  source: RateSource
  valueDate: string | null
  fetchedAt: string
  provider: string
}

export interface TodayRate {
  businessDate: string
  confirmed: ExchangeRateDto | null
  /** Pending suggestion that differs from the confirmed rate, if any. */
  suggestion: RateSuggestion | null
}

export interface SaleItemDto {
  id: string
  productId: string
  productCode: string
  productName: string
  qty: number
  priceCents: number
  costCents: number
}

export interface SaleDto {
  id: string
  number: number
  customerId: string | null
  customerName: string | null
  customerDocument: string | null
  userId: string
  username: string
  rate: number
  totalCents: number
  profitCents: number
  status: SaleStatus
  createdAt: string
  voidedAt: string | null
  items: SaleItemDto[]
}

export interface SalePage extends Page<SaleDto> {
  /** Completed sales among every match, not just this page. */
  completedCount: number
  totalCents: number
  profitCents: number
}

export interface SyncStatus {
  configured: boolean
  running: boolean
  pending: number
  lastSyncAt: string | null
  lastError: string | null
}

export interface CloudSettings {
  workerUrl: string
  hasToken: boolean
  secureStorage: boolean
}

export interface BackupInfo {
  file: string
  path: string
  size: number
  createdAt: string
}

export interface BackupSettings {
  dir: string
  defaultDir: string
  lastBackupAt: string | null
}

export interface ExportProgress {
  jobId: string
  stage: 'RUNNING' | 'DONE' | 'ERROR'
  percent: number
  file?: string
  message?: string
}

export interface BusinessDto {
  /** Empty until the owner fills it in (installs from before this setting). */
  name: string
  rif: string | null
}

export interface AppInfo {
  version: string
  platform: string
  dataPath: string
}

type R<T> = Promise<Result<T>>

export interface BlltApi {
  app: {
    info(): R<AppInfo>
    openPath(path: string): R<void>
  }
  auth: {
    status(): R<AuthStatus>
    setup(input: SetupInputRaw): R<SetupResult>
    login(input: LoginInput): R<SessionUser>
    logout(): R<void>
    recover(input: RecoverInput): R<void>
    changePassword(input: { current: string; next: string }): R<void>
  }
  business: {
    get(): R<BusinessDto>
    save(input: BusinessInputRaw): R<BusinessDto>
  }
  users: {
    list(): R<UserDto[]>
    create(input: UserCreateInput): R<UserDto>
    setActive(input: { id: string; active: boolean }): R<void>
    resetPassword(input: { id: string; password: string }): R<void>
    regenerateRecoveryCode(): R<string>
  }
  products: {
    list(query: ListQuery): R<ProductDto[]>
    page(query: PageQueryInput): R<ProductPage>
    findByCode(code: string): R<ProductDto | null>
    create(input: ProductInput): R<ProductDto>
    update(input: ProductUpdate): R<ProductDto>
    adjustStock(input: StockAdjust): R<ProductDto>
  }
  customers: {
    list(query: ListQuery): R<CustomerDto[]>
    page(query: PageQueryInput): R<Page<CustomerDto>>
    create(input: CustomerInput): R<CustomerDto>
    update(input: CustomerUpdate): R<CustomerDto>
  }
  rates: {
    today(): R<TodayRate>
    fetchSuggestion(): R<RateSuggestion | null>
    confirm(input: RateConfirmInput): R<ExchangeRateDto>
    dismiss(candidateId: string): R<void>
    history(): R<ExchangeRateDto[]>
  }
  sales: {
    create(input: SaleInput): R<SaleDto>
    list(query: SalesQuery): R<SaleDto[]>
    page(query: SalesPageQueryInput): R<SalePage>
    get(id: string): R<SaleDto>
    void(id: string): R<SaleDto>
  }
  dashboard: {
    summary(): R<DashboardSummary>
  }
  sync: {
    status(): R<SyncStatus>
    runNow(): R<SyncStatus>
    getSettings(): R<CloudSettings>
    saveSettings(input: CloudSettingsInput): R<CloudSettings>
    test(): R<{ ok: boolean; message: string }>
  }
  backups: {
    list(): R<BackupInfo[]>
    settings(): R<BackupSettings>
    runNow(): R<BackupInfo>
    chooseDir(): R<BackupSettings>
    resetDir(): R<BackupSettings>
    restore(path: string): R<void>
    chooseFileAndRestore(): R<boolean>
  }
  exports: {
    start(input: ExportInput): R<{ jobId: string }>
  }
  events: {
    onExportProgress(cb: (p: ExportProgress) => void): () => void
    onSyncStatus(cb: (s: SyncStatus) => void): () => void
    onRateSuggestion(cb: (s: RateSuggestion) => void): () => void
    onSessionEnded(cb: () => void): () => void
  }
}

/** Channels main pushes to the renderer. */
export const EventChannel = {
  EXPORT_PROGRESS: 'event:export-progress',
  SYNC_STATUS: 'event:sync-status',
  RATE_SUGGESTION: 'event:rate-suggestion',
  SESSION_ENDED: 'event:session-ended'
} as const
