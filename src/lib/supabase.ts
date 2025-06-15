import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qsoivvitfbxdwfscqdlx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzb2l2dml0ZmJ4ZHdmc2NxZGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5Mjg4ODQsImV4cCI6MjA2NTUwNDg4NH0.atW_tut7ESPJO_fZdThoMc6Gh5LS9IEl7qWHZBIC6GM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for firmware storage
export const uploadFirmware = async (file: File, version: string) => {
  const fileName = `firmware_${version}_${Date.now()}.${file.name.split('.').pop()}`;
  const filePath = `firmware/${fileName}`;

  const { data, error } = await supabase.storage
    .from('firmware')
    .upload(filePath, file, {
      upsert: false
    });

  if (error) {
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('firmware')
    .getPublicUrl(filePath);

  return {
    path: data.path,
    url: urlData.publicUrl
  };
};

export const deleteFirmware = async (filePath: string) => {
  const { error } = await supabase.storage
    .from('firmware')
    .remove([filePath]);

  if (error) {
    throw error;
  }
};

export const getFirmwareUrl = (filePath: string) => {
  const { data } = supabase.storage
    .from('firmware')
    .getPublicUrl(filePath);

  return data.publicUrl;
};