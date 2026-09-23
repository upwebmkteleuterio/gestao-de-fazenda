import { supabase } from '@/integrations/supabase/client';

export interface AppSettings {
  id: 'global';
  farm_name: string | null;
}

const appSettingsSelect = 'id, farm_name';

export const appSettingsService = {
  async getGlobal(): Promise<AppSettings> {
    const { data, error } = await supabase
      .from('app_settings')
      .select(appSettingsSelect)
      .eq('id', 'global')
      .single()
      .returns<AppSettings>();

    if (error) throw error;
    return data;
  },

  async updateFarmName(farmName: string): Promise<AppSettings> {
    const { data, error } = await supabase
      .from('app_settings')
      .update({ farm_name: farmName })
      .eq('id', 'global')
      .select(appSettingsSelect)
      .single()
      .returns<AppSettings>();

    if (error) throw error;
    return data;
  },
};
