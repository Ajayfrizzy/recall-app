export type RecallDateType =
  'event' | 'deadline' | 'published' | 'expires' | 'purchase' | 'travel' | 'other';
export interface RecallDate {
  type: RecallDateType;
  raw: string;
  normalized?: string;
  precision: 'exact' | 'month' | 'year' | 'unknown';
  confidence: number;
}
export type RecallSuggestedAction =
  'add_to_calendar' | 'create_reminder' | 'save_product' | 'save_place' | 'read_later' | 'keep';
export type RecallItem =
  | {
      type: 'product';
      suggestedAction?: RecallSuggestedAction | null;
      title: string;
      currentPrice?: { amount: number; currency: string; raw: string };
      originalPrice?: { amount: number; currency: string; raw: string };
      discount?: string;
      source?: string;
      confidence: number;
    }
  | {
      type: 'event';
      suggestedAction?: RecallSuggestedAction | null;
      title: string;
      location?: string;
      dates: RecallDate[];
      confidence: number;
      missingDetails?: string[];
    }
  | {
      type: 'deadline';
      suggestedAction?: RecallSuggestedAction | null;
      title: string;
      organization?: string;
      dates: RecallDate[];
      confidence: number;
    }
  | {
      type: 'place';
      suggestedAction?: RecallSuggestedAction | null;
      title: string;
      address?: string;
      source?: string;
      confidence: number;
    }
  | {
      type: 'content';
      suggestedAction?: RecallSuggestedAction | null;
      title?: string;
      author?: string;
      source?: string;
      summary: string;
      dates: RecallDate[];
      confidence: number;
    }
  | {
      type: 'general';
      suggestedAction?: RecallSuggestedAction | null;
      summary: string;
      confidence: number;
    };
export interface RecallAnalysis {
  category: 'event' | 'deadline' | 'product' | 'place' | 'content' | 'general' | 'mixed';
  confidence: number;
  summary: string;
  cardinality: 'single' | 'multiple';
  sourceApp?: string;
  items: RecallItem[];
  suggestedActions: RecallSuggestedAction[];
  warnings?: string[];
}
