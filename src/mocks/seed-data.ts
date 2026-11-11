import type { MenuCategory, MenuItem, Order, OrderChannel, OrderStatus, StaffMember } from '../api/types'

// Demo data for a fictional restaurant ("Salt & Ember"). Everything here lives in
// memory and resets on reload; no real people or businesses are represented.

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

export const categories: MenuCategory[] = [
  { id: 'cat-starters', name: 'Starters' },
  { id: 'cat-mains', name: 'Mains' },
  { id: 'cat-rice', name: 'Noodles & rice' },
  { id: 'cat-desserts', name: 'Desserts' },
  { id: 'cat-drinks', name: 'Drinks' },
]

const item = (id: string, categoryId: string, name: string, pesos: number, description: string, available = true): MenuItem => ({
  id,
  categoryId,
  name,
  price: pesos * 100,
  description,
  available,
})

export function seedMenu(): MenuItem[] {
  return [
    item('m-lumpia', 'cat-starters', 'Lumpia Shanghai', 180, 'Pork and vegetable spring rolls, sweet chili dip'),
    item('m-calamari', 'cat-starters', 'Crispy calamari', 260, 'Salt and pepper squid, garlic aioli'),
    item('m-salad', 'cat-starters', 'Garden salad', 220, 'Greens, mango, cashew, calamansi dressing'),
    item('m-adobo', 'cat-mains', 'Chicken adobo', 320, 'Soy-vinegar braise, garlic, bay leaf'),
    item('m-sinigang', 'cat-mains', 'Pork sinigang', 380, 'Tamarind broth, kangkong, radish'),
    item('m-liempo', 'cat-mains', 'Grilled liempo', 360, 'Charcoal pork belly, atchara'),
    item('m-karekare', 'cat-mains', 'Beef kare-kare', 480, 'Peanut stew, oxtail, bagoong on the side'),
    item('m-shrimp', 'cat-mains', 'Garlic butter shrimp', 420, 'Head-on shrimp, toasted garlic', false),
    item('m-pancit', 'cat-rice', 'Pancit canton', 280, 'Egg noodles, vegetables, pork'),
    item('m-garlicrice', 'cat-rice', 'Garlic fried rice', 90, 'Single serving'),
    item('m-bagoongrice', 'cat-rice', 'Bagoong rice', 240, 'Shrimp paste rice, green mango, egg'),
    item('m-halohalo', 'cat-desserts', 'Halo-halo', 190, 'Shaved ice, ube, leche flan, beans'),
    item('m-flan', 'cat-desserts', 'Leche flan', 140, 'Classic caramel custard'),
    item('m-ubecake', 'cat-desserts', 'Ube cheesecake', 210, 'Purple yam, graham crust', false),
    item('m-calamansi', 'cat-drinks', 'Calamansi juice', 95, 'Fresh-squeezed, lightly sweet'),
    item('m-icedtea', 'cat-drinks', 'House iced tea', 80, 'Bottomless with a meal'),
    item('m-mango', 'cat-drinks', 'Mango shake', 150, 'Carabao mango, ice'),
    item('m-coffee', 'cat-drinks', 'Brewed coffee', 110, 'Local barako beans'),
  ]
}

interface OrderSeed {
  number: number
  channel: OrderChannel
  reference: string
  status: OrderStatus
  placedMinutesAgo: number
  lines: Array<[menuItemId: string, quantity: number, note?: string]>
}

const orderSeeds: OrderSeed[] = [
  { number: 1046, channel: 'dine-in', reference: 'Table 7', status: 'new', placedMinutesAgo: 1, lines: [['m-adobo', 2], ['m-garlicrice', 2], ['m-icedtea', 2]] },
  { number: 1045, channel: 'delivery', reference: 'Rider R-218', status: 'new', placedMinutesAgo: 3, lines: [['m-pancit', 1], ['m-lumpia', 1]] },
  { number: 1044, channel: 'takeaway', reference: 'Pickup: Marco', status: 'new', placedMinutesAgo: 6, lines: [['m-sinigang', 1], ['m-garlicrice', 1, 'Extra garlic']] },
  { number: 1043, channel: 'dine-in', reference: 'Table 2', status: 'new', placedMinutesAgo: 8, lines: [['m-karekare', 1], ['m-bagoongrice', 1], ['m-mango', 2]] },
  { number: 1042, channel: 'dine-in', reference: 'Table 11', status: 'preparing', placedMinutesAgo: 9, lines: [['m-liempo', 2], ['m-calamansi', 2]] },
  { number: 1041, channel: 'delivery', reference: 'Rider R-204', status: 'preparing', placedMinutesAgo: 12, lines: [['m-adobo', 1], ['m-halohalo', 2]] },
  { number: 1040, channel: 'dine-in', reference: 'Table 5', status: 'preparing', placedMinutesAgo: 17, lines: [['m-calamari', 1], ['m-salad', 1, 'No cashew (allergy)'], ['m-coffee', 2]] },
  { number: 1039, channel: 'takeaway', reference: 'Pickup: Ines', status: 'ready', placedMinutesAgo: 14, lines: [['m-pancit', 2]] },
  { number: 1038, channel: 'dine-in', reference: 'Table 9', status: 'ready', placedMinutesAgo: 19, lines: [['m-sinigang', 1], ['m-flan', 2]] },
  { number: 1037, channel: 'delivery', reference: 'Rider R-199', status: 'ready', placedMinutesAgo: 22, lines: [['m-liempo', 1], ['m-garlicrice', 1]] },
  { number: 1036, channel: 'dine-in', reference: 'Table 3', status: 'completed', placedMinutesAgo: 38, lines: [['m-karekare', 1], ['m-garlicrice', 2]] },
  { number: 1035, channel: 'takeaway', reference: 'Pickup: Lea', status: 'completed', placedMinutesAgo: 46, lines: [['m-halohalo', 3]] },
  { number: 1034, channel: 'dine-in', reference: 'Table 1', status: 'completed', placedMinutesAgo: 55, lines: [['m-adobo', 2], ['m-mango', 1]] },
  { number: 1033, channel: 'delivery', reference: 'Rider R-187', status: 'completed', placedMinutesAgo: 71, lines: [['m-lumpia', 2], ['m-calamansi', 2]] },
]

export function seedOrders(menu: MenuItem[]): Order[] {
  return orderSeeds.map((seed) => {
    const lines = seed.lines.map(([menuItemId, quantity, note]) => {
      const menuItem = menu.find((m) => m.id === menuItemId)
      if (!menuItem) throw new Error(`Unknown menu item ${menuItemId}`)
      return { menuItemId, name: menuItem.name, quantity, unitPrice: menuItem.price, ...(note ? { note } : {}) }
    })
    const placedAt = minutesAgo(seed.placedMinutesAgo)
    return {
      id: `ord-${seed.number}`,
      number: seed.number,
      channel: seed.channel,
      reference: seed.reference,
      status: seed.status,
      lines,
      total: lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
      placedAt,
      updatedAt: placedAt,
    }
  })
}

export function seedStaff(): StaffMember[] {
  return [
    { id: 'st-andrea', name: 'Andrea Reyes', email: 'andrea@saltember.test', role: 'owner', status: 'active', lastActiveAt: minutesAgo(4) },
    { id: 'st-miguel', name: 'Miguel Santos', email: 'miguel@saltember.test', role: 'manager', status: 'active', lastActiveAt: minutesAgo(25) },
    { id: 'st-joy', name: 'Joy Villanueva', email: 'joy@saltember.test', role: 'cashier', status: 'active', lastActiveAt: minutesAgo(2) },
    { id: 'st-paolo', name: 'Paolo Cruz', email: 'paolo@saltember.test', role: 'server', status: 'active', lastActiveAt: minutesAgo(9) },
    { id: 'st-bea', name: 'Bea Mendoza', email: 'bea@saltember.test', role: 'server', status: 'active', lastActiveAt: minutesAgo(60 * 20) },
    { id: 'st-carlo', name: 'Carlo Ramos', email: 'carlo@saltember.test', role: 'kitchen', status: 'active', lastActiveAt: minutesAgo(1) },
    { id: 'st-lea', name: 'Lea Bautista', email: 'lea@saltember.test', role: 'kitchen', status: 'invited', lastActiveAt: null },
    { id: 'st-jun', name: 'Jun Aquino', email: 'jun@saltember.test', role: 'server', status: 'deactivated', lastActiveAt: minutesAgo(60 * 24 * 12) },
  ]
}

/** Small deterministic PRNG so the sales numbers look the same on every load. */
export function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
