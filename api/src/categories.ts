// Categories and subcategories: one table owns the labels, icons and the MCC codes per subcategory.
// A transaction always gets a leaf: a subcategory, or a category that has none.
// MCC ranges may overlap; the first leaf in this order wins (salons before generic services).
type Range = readonly [number, number]
type Sub = { id: string, label: string, mcc?: readonly Range[] }
type Category = { id: string, label: string, emoji: string, spending?: false, mcc?: readonly Range[], subcategories?: readonly Sub[] }

export const categories = [
  {
    id: 'groceries', label: 'Продукти', emoji: '🛒', subcategories: [
      { id: 'supermarket', label: 'Супермаркет', mcc: [[5411, 5411]] },
      { id: 'corner_store', label: 'Магазин біля дому', mcc: [[5422, 5451], [5499, 5499]] },
      { id: 'grocery_delivery', label: 'Доставка продуктів' },
      { id: 'alcohol_tobacco', label: 'Алкоголь і тютюн', mcc: [[5921, 5921], [5993, 5993]] }
    ]
  },
  {
    id: 'cafes_restaurants', label: 'Кафе та ресторани', emoji: '🍽️', subcategories: [
      { id: 'coffee_snacks', label: 'Кава і перекус', mcc: [[5462, 5462], [5814, 5814]] },
      { id: 'restaurants', label: 'Ресторани', mcc: [[5811, 5812]] },
      { id: 'food_delivery', label: 'Доставка їжі' },
      { id: 'bars', label: 'Бари', mcc: [[5813, 5813]] }
    ]
  },
  {
    id: 'transport', label: 'Транспорт', emoji: '🚕', subcategories: [
      { id: 'taxi', label: 'Таксі', mcc: [[4121, 4121]] },
      { id: 'public_transport', label: 'Громадський транспорт', mcc: [[4111, 4111]] },
      { id: 'trains_buses', label: 'Поїзди та автобуси', mcc: [[4011, 4011], [4112, 4112], [4131, 4131]] },
      { id: 'fuel', label: 'Паливо', mcc: [[5172, 5172], [5541, 5542], [5983, 5983]] },
      { id: 'car_service', label: 'Обслуговування авто', mcc: [[3351, 3500], [5531, 5533], [7512, 7519], [7531, 7549]] },
      { id: 'parking', label: 'Паркування', mcc: [[4784, 4784], [7523, 7523]] }
    ]
  },
  {
    id: 'housing_utilities', label: 'Житло та комуналка', emoji: '🏠', subcategories: [
      { id: 'rent', label: 'Оренда житла', mcc: [[6513, 6513]] },
      { id: 'electricity', label: 'Електроенергія' },
      { id: 'gas_heating', label: 'Газ і опалення' },
      { id: 'water', label: 'Вода' },
      { id: 'utility_bills', label: 'Комунальні рахунки', mcc: [[4900, 4900]] }
    ]
  },
  {
    id: 'telecom_subscriptions', label: 'Зв’язок і підписки', emoji: '📲', subcategories: [
      { id: 'mobile', label: 'Мобільний зв’язок', mcc: [[4812, 4814]] },
      { id: 'internet_tv', label: 'Інтернет і ТБ', mcc: [[4816, 4816], [4899, 4899]] },
      { id: 'digital_subscriptions', label: 'Цифрові підписки', mcc: [[5734, 5734], [5815, 5815], [5817, 5818], [7372, 7372]] }
    ]
  },
  {
    id: 'shopping', label: 'Покупки', emoji: '🛍️', subcategories: [
      { id: 'clothing_shoes', label: 'Одяг і взуття', mcc: [[5600, 5654], [5656, 5699]] },
      { id: 'electronics', label: 'Техніка і гаджети', mcc: [[5045, 5045], [5722, 5722], [5732, 5732], [5946, 5946]] },
      { id: 'marketplaces', label: 'Маркетплейси', mcc: [[5262, 5262], [5300, 5399], [5964, 5969], [5999, 5999]] },
      { id: 'gifts', label: 'Подарунки', mcc: [[5947, 5947], [5992, 5992]] }
    ]
  },
  {
    id: 'home', label: 'Дім і побут', emoji: '🔨', subcategories: [
      { id: 'renovation', label: 'Ремонт і будматеріали', mcc: [[5200, 5261]] },
      { id: 'furniture_interior', label: 'Меблі та інтер’єр', mcc: [[5712, 5719]] },
      { id: 'household_chemicals', label: 'Побутова хімія' },
      { id: 'home_services', label: 'Послуги для дому', mcc: [[1520, 1799], [7342, 7349]] }
    ]
  },
  {
    id: 'health_beauty', label: 'Здоров’я і краса', emoji: '💊', subcategories: [
      { id: 'pharmacy', label: 'Аптека і ліки', mcc: [[5122, 5122], [5912, 5912], [5975, 5976]] },
      { id: 'doctors', label: 'Лікарі', mcc: [[8011, 8020], [8031, 8099]] },
      { id: 'dentistry', label: 'Стоматологія', mcc: [[8021, 8021]] },
      { id: 'cosmetics', label: 'Косметика', mcc: [[5977, 5977]] },
      { id: 'salons_care', label: 'Салони та догляд', mcc: [[7230, 7230], [7297, 7298]] }
    ]
  },
  {
    id: 'entertainment', label: 'Розваги та дозвілля', emoji: '🎭', subcategories: [
      { id: 'cinema_theatre', label: 'Кіно і театр', mcc: [[7832, 7841], [7922, 7922]] },
      { id: 'games', label: 'Ігри', mcc: [[5816, 5816], [5945, 5945], [7993, 7994]] },
      { id: 'books', label: 'Книги', mcc: [[5192, 5192], [5942, 5942], [5994, 5994]] },
      { id: 'events_concerts', label: 'Заходи і концерти', mcc: [[7929, 7929], [7991, 7992], [7995, 7996], [7998, 7999]] }
    ]
  },
  {
    id: 'sport_hobby', label: 'Спорт і хобі', emoji: '🏋️', subcategories: [
      { id: 'gym_classes', label: 'Спортзал і секції', mcc: [[7911, 7911], [7941, 7941], [7997, 7997]] },
      { id: 'sports_goods', label: 'Спортивні товари', mcc: [[5655, 5655], [5940, 5941]] },
      { id: 'hobby', label: 'Хобі', mcc: [[5733, 5733], [5949, 5949], [5970, 5971]] }
    ]
  },
  {
    id: 'education', label: 'Освіта', emoji: '🎓', subcategories: [
      { id: 'courses_trainings', label: 'Курси і тренінги', mcc: [[8241, 8249], [8299, 8299]] },
      { id: 'school_kindergarten', label: 'Школа і садок', mcc: [[8211, 8220], [8351, 8351]] },
      { id: 'study_materials', label: 'Навчальні матеріали', mcc: [[5943, 5943]] }
    ]
  },
  {
    id: 'travel', label: 'Подорожі', emoji: '✈️', subcategories: [
      { id: 'travel_accommodation', label: 'Житло в поїздці', mcc: [[3501, 3999], [7011, 7012]] },
      { id: 'tickets', label: 'Квитки', mcc: [[3000, 3350], [4411, 4411], [4511, 4582], [4722, 4723]] },
      { id: 'travel_entertainment', label: 'Розваги в поїздці' }
    ]
  },
  {
    id: 'charity', label: 'Благодійність', emoji: '❤️', subcategories: [
      { id: 'army_funds', label: 'ЗСУ і фонди', mcc: [[8398, 8398], [8661, 8661]] },
      { id: 'helping_family', label: 'Допомога близьким' }
    ]
  },
  {
    id: 'mandatory_payments', label: 'Обов’язкові платежі', emoji: '🧾', subcategories: [
      { id: 'loans_interest', label: 'Кредити і відсотки' },
      { id: 'taxes_fees', label: 'Податки і збори', mcc: [[9211, 9399]] },
      { id: 'insurance', label: 'Страхування', mcc: [[5960, 5960], [6300, 6399]] },
      { id: 'bank_fees', label: 'Комісії банку' }
    ]
  },
  {
    id: 'pets', label: 'Тварини', emoji: '🐾', subcategories: [
      { id: 'pet_food_supplies', label: 'Корм і товари', mcc: [[5995, 5995]] },
      { id: 'vet', label: 'Ветеринар', mcc: [[742, 742]] }
    ]
  },
  {
    id: 'other', label: 'Інше', emoji: '🏷️', subcategories: [
      { id: 'delivery_post', label: 'Доставка і пошта', mcc: [[4214, 4215], [9402, 9402]] },
      { id: 'services', label: 'Послуги', mcc: [[7210, 7299], [7399, 7399], [8999, 8999]] },
      { id: 'other_expenses', label: 'Інші витрати' }
    ]
  },
  // service categories outside the spending list
  { id: 'transfers', label: 'Перекази', emoji: '💸', mcc: [[4829, 4829], [6010, 6012], [6051, 6051], [6538, 6540]] },
  { id: 'income', label: 'Надходження', emoji: '💰', spending: false },
  { id: 'own', label: 'Між своїми рахунками', emoji: '🔁', spending: false }
] as const satisfies readonly Category[]

type Leaf = { id: string, label: string, mcc?: readonly Range[], parent: Category }
const leaves: Leaf[] = (categories as readonly Category[]).flatMap((c) =>
  c.subcategories ? c.subcategories.map((s) => ({ ...s, parent: c })) : [{ ...c, parent: c }])

// ids a transaction can carry and an override can store
export type CategoryId = string
export const categoryIds = leaves.map((l) => l.id)

const FALLBACK = 'other_expenses'

// one key per merchant, so a refund ("Скасування. Rozetka") shares the purchase's override
export const merchantKey = (description: string) =>
  description.toLowerCase().replace(/^скасування\.\s*/, '').trim()

// Monobank jar top-ups: "Поповнення «…»", "Регулярне поповнення «…»"
const JAR = /^(регулярне )?поповнення «/i

export function categorize (mcc: number, description: string, amount: number, override?: CategoryId | null): CategoryId {
  const id = override ??
    (JAR.test(description) ? 'army_funds' : leaves.find((l) => l.mcc?.some(([from, to]) => mcc >= from && mcc <= to))?.id ?? FALLBACK)
  // money coming in through a transfer is income; elsewhere a positive amount is a refund
  return id === 'transfers' && amount > 0 ? 'income' : id
}

// tree for the UI: every category with its parent-level info and leaves
export const categoryTree = (categories as readonly Category[]).map(({ id, label, emoji, spending, subcategories }) => ({
  id,
  label,
  emoji,
  spending: spending ?? true,
  subcategories: (subcategories ?? []).map(({ id, label }) => ({ id, label }))
}))
