export type BotState =
  | 'idle'
  | 'waiting_segment'
  | 'choosing_size'
  | 'searching'
  | 'browsing_results'
  | 'building_capsule';

export type Segment = 'mass' | 'mid' | 'premium';

export type ProductSource = 'wildberries' | 'lamoda';

export type ItemStyle = 'casual' | 'business' | 'sport' | 'evening' | 'streetwear';

export interface SearchQuery {
  type: 'photo' | 'text';
  item_type: string;
  color: string | null;
  style: ItemStyle | null;
  additional_details: string | null;
  // Временное хранение ожидающего добавления товара (когда нет имени клиента)
  pending_product_id?: string;
  pending_source?: ProductSource;
}

export interface Product {
  product_id: string;
  source: ProductSource;
  name: string;
  price: number;
  url: string;
  image_url: string;
}

export interface Session {
  id: string;
  telegram_id: number;
  state: BotState;
  current_query: SearchQuery | null;
  current_segment: Segment;
  current_client_name: string | null;
}

export interface Capsule {
  id: string;
  telegram_id: number;
  client_name: string;
  status: 'active' | 'exported';
}

export interface CapsuleItem {
  id: string;
  capsule_id: string;
  telegram_id: number;
  source: ProductSource;
  product_id: string;
  name: string;
  price: number;
  url: string;
  image_url: string;
}
