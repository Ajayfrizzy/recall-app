export type RecallDateType =
  'event' | 'deadline' | 'published' | 'expires' | 'purchase' | 'travel' | 'other';
export interface RecallDate {
  type: RecallDateType;
  raw: string;
  normalized?: string;
  precision: 'exact' | 'month' | 'year' | 'unknown';
  confidence: number;
}
export type RecallItem =
  | {
      type: 'product';
      title: string;
      currentPrice?: { amount: number; currency: string; raw: string };
      originalPrice?: { amount: number; currency: string; raw: string };
      discount?: string;
      source?: string;
      confidence: number;
    }
  | {
      type: 'event';
      title: string;
      location?: string;
      dates: RecallDate[];
      confidence: number;
      missingDetails?: string[];
    }
  | {
      type: 'deadline';
      title: string;
      organization?: string;
      dates: RecallDate[];
      confidence: number;
    }
  | { type: 'place'; title: string; address?: string; source?: string; confidence: number }
  | {
      type: 'content';
      title?: string;
      author?: string;
      source?: string;
      summary: string;
      dates: RecallDate[];
      confidence: number;
    }
  | { type: 'general'; summary: string; confidence: number };
export interface RecallAnalysis {
  category: 'event' | 'deadline' | 'product' | 'place' | 'content' | 'general' | 'mixed';
  confidence: number;
  summary: string;
  cardinality: 'single' | 'multiple';
  sourceApp?: string;
  items: RecallItem[];
  suggestedActions: Array<
    'add_to_calendar' | 'create_reminder' | 'save_product' | 'save_place' | 'read_later' | 'keep'
  >;
  warnings?: string[];
}
