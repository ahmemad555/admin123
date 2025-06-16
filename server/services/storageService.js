import GoogleDriveService from './googleDriveService.js';
import { supabase } from '../config.js';
import { config } from '../config.js';

class StorageService {
  constructor() {
    this.googleDrive = new GoogleDriveService();
  }

  // رفع ملف حسب مقدم الخدمة المحدد
  async uploadFile(fileBuffer, fileName, version, options = {}) {
    const results = {};
    const provider = options.provider || config.storageProvider;

    try {
      if (provider === 'supabase' || provider === 'both') {
        results.supabase = await this.uploadToSupabase(fileBuffer, fileName, version);
      }

      if (provider === 'googledrive' || provider === 'both') {
        results.googleDrive = await this.uploadToGoogleDrive(fileBuffer, fileName);
      }

      return {
        success: true,
        provider,
        results
      };
    } catch (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }
  }

  // رفع إلى Supabase Storage
  async uploadToSupabase(fileBuffer, fileName, version) {
    const filePath = `firmware/${fileName}`;

    const { data, error } = await supabase.storage
      .from('firmware')
      .upload(filePath, fileBuffer, {
        contentType: 'application/octet-stream',
        upsert: false
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // الحصول على الـ public URL
    const { data: urlData } = supabase.storage
      .from('firmware')
      .getPublicUrl(filePath);

    // إضافة السجل إلى قاعدة البيانات
    const { data: dbData, error: dbError } = await supabase
      .from('firmware_updates')
      .insert([
        {
          version,
          url: urlData.publicUrl
        }
      ])
      .select();

    if (dbError) {
      // حذف الملف من Storage في حالة فشل إدراج قاعدة البيانات
      await supabase.storage.from('firmware').remove([filePath]);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    return {
      path: data.path,
      url: urlData.publicUrl,
      dbId: dbData[0].id
    };
  }

  // رفع إلى Google Drive
  async uploadToGoogleDrive(fileBuffer, fileName) {
    return await this.googleDrive.uploadFile(fileBuffer, fileName);
  }

  // حذف ملف
  async deleteFile(fileInfo, provider = null) {
    const targetProvider = provider || config.storageProvider;

    try {
      if (targetProvider === 'supabase' || targetProvider === 'both') {
        if (fileInfo.supabasePath) {
          await supabase.storage.from('firmware').remove([fileInfo.supabasePath]);
        }
        if (fileInfo.supabaseDbId) {
          await supabase
            .from('firmware_updates')
            .delete()
            .eq('id', fileInfo.supabaseDbId);
        }
      }

      if (targetProvider === 'googledrive' || targetProvider === 'both') {
        if (fileInfo.googleDriveId) {
          await this.googleDrive.deleteFile(fileInfo.googleDriveId);
        }
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Storage delete failed: ${error.message}`);
    }
  }

  // الحصول على معلومات الاتصال
  async getConnectionStatus() {
    const status = {
      supabase: { connected: true }, // Supabase دائماً متصل إذا كان مكوناً
      googleDrive: await this.googleDrive.testConnection()
    };

    return status;
  }

  // الحصول على رابط تفويض Google Drive
  getGoogleDriveAuthUrl() {
    return this.googleDrive.getAuthUrl();
  }

  // تبديل كود التفويض بـ tokens
  async exchangeGoogleDriveCode(code) {
    return await this.googleDrive.getTokens(code);
  }
}

export default StorageService;