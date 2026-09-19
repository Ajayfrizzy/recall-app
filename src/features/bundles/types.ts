export type BundleType =
  'event' | 'project' | 'shopping' | 'travel' | 'application' | 'topic' | 'general';

export interface BundleItemRef {
  screenshotId: string;
  itemIndex?: number;
}

export interface BundleItemMembershipOverride {
  screenshotId: string;
  itemIndex: number;
  excluded: boolean;
  updatedAt: number;
}

export interface RecallBundle {
  id: string;
  title: string;
  type: BundleType;
  screenshotIds: string[];
  itemRefs: BundleItemRef[];
  createdAt: number;
  updatedAt: number;
  confidence?: number;
  reason?: string;
  status: 'active' | 'archived';
}
