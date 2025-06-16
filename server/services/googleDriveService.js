import { google } from 'googleapis';
import { config } from '../config.js';
import fs from 'fs';
import path from 'path';

class GoogleDriveService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.googleDrive.clientId,
      config.googleDrive.clientSecret,
      config.googleDrive.redirectUri
    );

    // إعداد الـ refresh token إذا كان متوفراً
    if (config.googleDrive.refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: config.googleDrive.refreshToken
      });
    }

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  // رفع ملف إلى Google Drive
  async uploadFile(fileBuffer, fileName, mimeType = 'application/octet-stream') {
    try {
      const fileMetadata = {
        name: fileName,
        parents: config.googleDrive.folderId ? [config.googleDrive.folderId] : undefined
      };

      const media = {
        mimeType: mimeType,
        body: fileBuffer
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink,webContentLink,size'
      });

      // جعل الملف قابل للوصول العام
      await this.drive.permissions.create({
        fileId: response.data.id,
        resource: {
          role: 'reader',
          type: 'anyone'
        }
      });

      return {
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink,
        downloadLink: response.data.webContentLink,
        size: response.data.size
      };
    } catch (error) {
      console.error('Google Drive upload error:', error);
      throw new Error(`Failed to upload to Google Drive: ${error.message}`);
    }
  }

  // حذف ملف من Google Drive
  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({
        fileId: fileId
      });
      return true;
    } catch (error) {
      console.error('Google Drive delete error:', error);
      throw new Error(`Failed to delete from Google Drive: ${error.message}`);
    }
  }

  // الحصول على معلومات الملف
  async getFileInfo(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,size,webViewLink,webContentLink,createdTime,modifiedTime'
      });
      return response.data;
    } catch (error) {
      console.error('Google Drive get file error:', error);
      throw new Error(`Failed to get file info from Google Drive: ${error.message}`);
    }
  }

  // إنشاء مجلد جديد
  async createFolder(folderName, parentFolderId = null) {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id,name'
      });

      return response.data;
    } catch (error) {
      console.error('Google Drive create folder error:', error);
      throw new Error(`Failed to create folder in Google Drive: ${error.message}`);
    }
  }

  // الحصول على رابط التفويض
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // تبديل كود التفويض بـ tokens
  async getTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      console.error('Google Drive token exchange error:', error);
      throw new Error(`Failed to exchange code for tokens: ${error.message}`);
    }
  }

  // التحقق من صحة الاتصال
  async testConnection() {
    try {
      const response = await this.drive.about.get({
        fields: 'user,storageQuota'
      });
      return {
        connected: true,
        user: response.data.user,
        storage: response.data.storageQuota
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

export default GoogleDriveService;