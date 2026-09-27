import type { ProductDto, CustomerDto } from '../../../../../types/api'

export interface CartLine {
  product: ProductDto
  qty: number
}

/** The sale being built. Lives across page switches so an interruption doesn't lose it. */
class Cart {
  lines = $state<CartLine[]>([])
  customer = $state<CustomerDto | null>(null)

  totalCents = $derived(this.lines.reduce((s, l) => s + l.qty * l.product.priceCents, 0))
  count = $derived(this.lines.reduce((s, l) => s + l.qty, 0))

  add(product: ProductDto, qty = 1) {
    const line = this.lines.find((l) => l.product.id === product.id)
    if (line) line.qty = Math.min(line.qty + qty, product.stock)
    else if (product.stock > 0) this.lines.push({ product, qty: Math.min(qty, product.stock) })
  }

  setQty(productId: string, qty: number) {
    const line = this.lines.find((l) => l.product.id === productId)
    if (!line) return
    if (qty <= 0) this.remove(productId)
    else line.qty = Math.min(qty, line.product.stock)
  }

  remove(productId: string) {
    this.lines = this.lines.filter((l) => l.product.id !== productId)
  }

  clear() {
    this.lines = []
    this.customer = null
  }
}

export const cart = new Cart()
