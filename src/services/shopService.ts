import { supabase } from '../core/supabase';

export interface PurchaseResult {
  success: boolean;
  new_xp?: number;
  error?: string;
}

export async function purchaseItem(itemType: string, itemId: string, itemCost: number): Promise<PurchaseResult> {
  const { data, error } = await supabase.rpc('purchase_item', {
    item_type: itemType,
    item_id: itemId,
    item_cost: itemCost,
  });
  if (error) return { success: false, error: error.message };
  return data as PurchaseResult;
}
