import { createClient } from '@supabase/supabase-js';

export const config = {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'fota-concrete-printing-secret-key',
  uploadPath: './server/uploads',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedFileTypes: ['.bin', '.hex'],
  database: {
    // إعدادات قاعدة البيانات - يمكن تطويرها لاحقاً
    type: 'memory', // memory, sqlite, mysql, postgresql
    connectionString: process.env.DATABASE_URL
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  },
  supabase: {
    url: process.env.VITE_SUPABASE_URL || 'https://qsoivvitfbxdwfscqdlx.supabase.co',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzb2l2dml0ZmJ4ZHdmc2NxZGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5Mjg4ODQsImV4cCI6MjA2NTUwNDg4NH0.atW_tut7ESPJO_fZdThoMc6Gh5LS9IEl7qWHZBIC6GM',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
};

// إنشاء Supabase client للعمليات الإدارية (server-side)
export const supabase = createClient(
  config.supabase.url, 
  config.supabase.serviceRoleKey || config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// إنشاء Supabase client للعمليات العامة (client-side)
export const supabaseAnon = createClient(config.supabase.url, config.supabase.anonKey);