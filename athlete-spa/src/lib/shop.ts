import hoodieMen1 from '@/assets/shop/hoodie-men-1.webp';
import hoodieMen2 from '@/assets/shop/hoodie-men-2.webp';
import hoodieWomen1 from '@/assets/shop/hoodie-women-1.webp';
import hoodieWomen2 from '@/assets/shop/hoodie-women-2.webp';
import tankWomen1 from '@/assets/shop/tank-women-1.webp';
import tankWomen2 from '@/assets/shop/tank-women-2.webp';
import teeMen1 from '@/assets/shop/tee-men-1.webp';
import teeMen2 from '@/assets/shop/tee-men-2.webp';

export type ProductCategory = 'hoodie' | 'tee';

export interface ProductColor {
  name: string;
  /** Fabric colour. */
  fill: string;
  /** Print colour on that fabric. */
  ink: string;
}

export interface Product {
  id: string;
  category: ProductCategory;
  name: string;
  tagline: string;
  description: string;
  /** Price in PLN. */
  price: number;
  /** Primary product photo; without it the garment is drawn from `print` and the colour. */
  image?: string;
  /** Gallery of product photos (e.g. front & back view on models). */
  images?: string[];
  /** Lines of the chest print on the drawn garment. */
  print: string[];
  colors: ProductColor[];
  sizes: string[];
  details: string[];
  badge?: string;
  /** Product page in the store; without it the product shows as coming soon. */
  url?: string;
}

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  hoodie: 'Bluzy',
  tee: 'Koszulki',
};

const MELANGE: ProductColor = { name: 'Grafitowy melanż', fill: '#3a3c40', ink: '#ffffff' };

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

/**
 * Merch catalogue. Static until the store has an API: add a product here and
 * it shows up on the Sklep screen; set `url` once it can actually be bought.
 * The admin panel recommends products by `id` on the home screen — keep
 * `SHOP_PRODUCT_OPTIONS` in the backend's `src/lib/dashboard-promos.ts` in step.
 */
export const PRODUCTS: Product[] = [
  {
    id: 'hoodie-men',
    category: 'hoodie',
    name: 'Bluza #leniwakluska męska',
    tagline: 'Kangurka z nadrukiem na plecach',
    description: 'Gruba kangurka z dużym nadrukiem pary ze sztangą na plecach. Prosty krój, który nie krępuje barków.',
    price: 219,
    image: hoodieMen2,
    images: [hoodieMen2, hoodieMen1],
    print: ['#LENIWAKLUSKA'],
    colors: [MELANGE],
    sizes: SIZES,
    details: ['Bawełna 80%, poliester 20%', 'Gramatura 380 g/m²', 'Krój regular, kieszeń kangurka'],
    badge: 'Hit',
  },
  {
    id: 'hoodie-women',
    category: 'hoodie',
    name: 'Bluza #leniwakluska damska',
    tagline: 'Oversize z nadrukiem na plecach',
    description: 'Miękka bluza oversize z opuszczoną linią ramion i dużym nadrukiem pary ze sztangą na plecach.',
    price: 219,
    image: hoodieWomen2,
    images: [hoodieWomen2, hoodieWomen1],
    print: ['#LENIWAKLUSKA'],
    colors: [MELANGE],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    details: ['Bawełna 80%, poliester 20%', 'Gramatura 360 g/m²', 'Krój oversize, kieszeń kangurka'],
  },
  {
    id: 'tee-men',
    category: 'tee',
    name: 'Koszulka #leniwakluska męska',
    tagline: 'T-shirt z nadrukiem na plecach',
    description: 'Koszulka, w której zrobisz i trening, i zakupy. Gęsta bawełna i duży nadruk pary ze sztangą na plecach.',
    price: 99,
    image: teeMen2,
    images: [teeMen2, teeMen1],
    print: ['#LENIWAKLUSKA'],
    colors: [MELANGE],
    sizes: SIZES,
    details: ['Bawełna 100%', 'Gramatura 200 g/m²', 'Krój regular'],
  },
  {
    id: 'tank-women',
    category: 'tee',
    name: 'Top #leniwakluska damski',
    tagline: 'Bokserka z nadrukiem na plecach',
    description: 'Lekki top z wyciętymi plecami, który nie krępuje ruchów na treningu. Nadruk pary ze sztangą na plecach.',
    price: 89,
    image: tankWomen2,
    images: [tankWomen2, tankWomen1],
    print: ['#LENIWAKLUSKA'],
    colors: [MELANGE],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    details: ['Bawełna 95%, elastan 5%', 'Gramatura 180 g/m²', 'Plecy typu bokserka'],
    badge: 'Nowość',
  },
];

const PRICE_FORMAT = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });

export function formatPrice(price: number): string {
  return PRICE_FORMAT.format(price);
}
