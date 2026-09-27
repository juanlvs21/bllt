import {
  DomainError,
  ErrorCode,
  nowIso,
  OutboxEntity,
  type CustomerInput,
  type CustomerRow,
  type CustomerUpdate,
  type ListQuery
} from '@bllt/shared'
import type { CustomerDto } from '../../../types/api'
import { transaction } from '../../core/db'
import { notFound } from '../../core/errors'
import { newId } from '../../utils/id'
import { syncService } from '../sync/sync.service'
import { customerRepository } from './customer.repository'

/** Normalizes cédula/RIF: "v-12.345.678" -> "V-12345678". */
function normalizeDocument(document: string | null): string | null {
  if (!document) return null
  const clean = document.toUpperCase().replace(/[\s.]/g, '')
  const match = clean.match(/^([VEJGP])-?(\d+)(-?\d)?$/)
  if (!match) return clean
  return `${match[1]}-${match[2]}${match[3] ? `-${match[3].replace('-', '')}` : ''}`
}

function assertDocumentFree(document: string | null, exceptId?: string): void {
  if (!document) return
  const existing = customerRepository.findByDocument(document)
  if (existing && existing.id !== exceptId) {
    throw new DomainError(
      ErrorCode.CONFLICT,
      `La cédula o RIF ${document} ya es de ${existing.name}`
    )
  }
}

const toDto = (row: CustomerRow): CustomerDto => ({
  id: row.id,
  name: row.name,
  document: row.document,
  phone: row.phone,
  createdAt: row.createdAt,
  salesCount: 0,
  totalCents: 0
})

export const customerService = {
  list(query: ListQuery): CustomerDto[] {
    return customerRepository.list(query.search)
  },

  create(input: CustomerInput): CustomerDto {
    const document = normalizeDocument(input.document)
    assertDocumentFree(document)
    const now = nowIso()
    const row: CustomerRow = { id: newId(), ...input, document, createdAt: now, updatedAt: now }
    transaction(() => {
      customerRepository.insert(row)
      syncService.enqueue(OutboxEntity.CUSTOMER, row.id, row)
    })
    return toDto(row)
  },

  update(input: CustomerUpdate): CustomerDto {
    if (!customerRepository.findById(input.id)) throw notFound('El cliente')
    const document = normalizeDocument(input.document)
    assertDocumentFree(document, input.id)
    const { id, ...patch } = input
    return transaction(() => {
      const row = customerRepository.update(id, { ...patch, document, updatedAt: nowIso() })
      syncService.enqueue(OutboxEntity.CUSTOMER, row.id, row)
      return toDto(row)
    })
  },

  exists(id: string): boolean {
    return !!customerRepository.findById(id)
  }
}
