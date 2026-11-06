// Spending categories: one table owns the label, icon and the MCC codes that fall into it
export const categories = [
  { id: 'groceries', label: 'Продукти', emoji: '🛒', mcc: [[5411, 5411], [5422, 5451], [5499, 5499]] },
  { id: 'cafe', label: 'Кафе й ресторани', emoji: '🍽️', mcc: [[5462, 5462], [5811, 5814]] },
  { id: 'transport', label: 'Транспорт', emoji: '🚕', mcc: [[3351, 3500], [4011, 4131], [4784, 4784], [5541, 5542], [5983, 5983], [7512, 7523]] },
  { id: 'travel', label: 'Подорожі', emoji: '✈️', mcc: [[3000, 3350], [3501, 3999], [4411, 4582], [4722, 4723], [7011, 7012]] },
  { id: 'subscriptions', label: 'Підписки й цифрове', emoji: '📲', mcc: [[4816, 4816], [4899, 4899], [5734, 5734], [5815, 5818], [7372, 7372]] },
  { id: 'health', label: "Здоров'я", emoji: '💊', mcc: [[5122, 5122], [5912, 5912], [5975, 5976], [8011, 8099]] },
  { id: 'housing', label: 'Житло', emoji: '🏠', mcc: [[6513, 6513]] },
  { id: 'home', label: 'Дім і ремонт', emoji: '🔨', mcc: [[5200, 5261], [5712, 5722]] },
  { id: 'utilities', label: "Комунальні й зв'язок", emoji: '💡', mcc: [[4812, 4814], [4900, 4900]] },
  { id: 'entertainment', label: 'Розваги', emoji: '🎭', mcc: [[7832, 7841], [7911, 7999]] },
  { id: 'shopping', label: 'Покупки', emoji: '🛍️', mcc: [[742, 742], [5262, 5262], [5300, 5399], [5600, 5699], [5732, 5733], [5900, 5999]] },
  { id: 'charity', label: 'Благодійність', emoji: '❤️', mcc: [[8398, 8398], [8661, 8661]] },
  { id: 'transfers', label: 'Перекази', emoji: '💸', mcc: [[4829, 4829], [6010, 6012], [6051, 6051], [6538, 6540]] },
  { id: 'other', label: 'Інше', emoji: '🏷️', mcc: [] },
  // not spending: excluded from the summary
  { id: 'income', label: 'Надходження', emoji: '💰', mcc: [] },
  { id: 'own', label: 'Між своїми рахунками', emoji: '🔁', mcc: [] }
] as const satisfies ReadonlyArray<{ id: string, label: string, emoji: string, mcc: ReadonlyArray<readonly [number, number]> }>

export type CategoryId = typeof categories[number]['id']
export const categoryIds = categories.map((c) => c.id)

// one key per merchant, so a refund ("Скасування. Rozetka") shares the purchase's override
export const merchantKey = (description: string) =>
  description.toLowerCase().replace(/^скасування\.\s*/, '').trim()

// Monobank jar top-ups: "Поповнення «…»", "Регулярне поповнення «…»"
const JAR = /^(регулярне )?поповнення «/i

export function categorize (mcc: number, description: string, amount: number, override?: CategoryId): CategoryId {
  const id: CategoryId = override ??
    (JAR.test(description) ? 'charity' : categories.find((c) => c.mcc.some(([from, to]) => mcc >= from && mcc <= to))?.id ?? 'other')
  // money coming in through a transfer is income; elsewhere a positive amount is a refund
  return id === 'transfers' && amount > 0 ? 'income' : id
}
