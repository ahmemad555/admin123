# FOTA System for Concrete 3D Printing

نظام إدارة التحديثات عن بُعد (FOTA) لطابعات الخرسانة ثلاثية الأبعاد

## 🚀 النشر على Vercel

### المتطلبات الأساسية
- حساب [Vercel](https://vercel.com)
- حساب [Supabase](https://supabase.com)
- حساب [Google Cloud Console](https://console.cloud.google.com) (اختياري)

### خطوات النشر

#### 1. إعداد المشروع على Vercel

```bash
# تثبيت Vercel CLI
npm i -g vercel

# تسجيل الدخول
vercel login

# نشر المشروع
vercel --prod
```

#### 2. إعداد متغيرات البيئة على Vercel

اذهب إلى Vercel Dashboard → Project → Settings → Environment Variables وأضف:

```env
NODE_ENV=production
JWT_SECRET=your-production-jwt-secret-key-here

# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google Drive (اختياري)
GOOGLE_DRIVE_CLIENT_ID=your-google-drive-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-google-drive-client-secret
GOOGLE_DRIVE_REDIRECT_URI=https://your-vercel-domain.vercel.app/api/firmware/storage/googledrive/callback
GOOGLE_DRIVE_REFRESH_TOKEN=your-google-drive-refresh-token
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id

# Storage Provider
STORAGE_PROVIDER=both

# Frontend URL
FRONTEND_URL=https://your-vercel-domain.vercel.app
```

#### 3. إعداد Supabase

1. **إنشاء الجداول:**
```sql
-- إنشاء جدول firmware_updates
CREATE TABLE IF NOT EXISTS firmware_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  url text,
  created_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE firmware_updates ENABLE ROW LEVEL SECURITY;

-- إضافة سياسات الأمان
CREATE POLICY "Allow public read access" ON firmware_updates
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access" ON firmware_updates
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update access" ON firmware_updates
  FOR UPDATE TO public USING (true);
```

2. **إعداد Storage Bucket:**
```sql
-- إنشاء bucket للفيرموير
INSERT INTO storage.buckets (id, name, public) 
VALUES ('firmware', 'firmware', true);

-- سياسة الرفع
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'firmware');

-- سياسة القراءة
CREATE POLICY "Allow public downloads" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'firmware');
```

#### 4. إعداد Google Drive API (اختياري)

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com)
2. أنشئ مشروع جديد أو استخدم موجود
3. فعّل Google Drive API
4. أنشئ OAuth 2.0 credentials
5. أضف Redirect URI: `https://your-vercel-domain.vercel.app/api/firmware/storage/googledrive/callback`

### 🔧 التطوير المحلي

```bash
# تثبيت التبعيات
npm install

# تشغيل السيرفر
npm run dev:server

# تشغيل الواجهة الأمامية
npm run dev
```

### 📁 هيكل المشروع

```
├── server/                 # Backend API
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   └── config.js          # Configuration
├── src/                   # Frontend React app
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── lib/              # Utilities
│   └── types/            # TypeScript types
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies
```

## المميزات

### 🔐 نظام المصادقة
- تسجيل دخول آمن بـ JWT
- مستويات صلاحيات مختلفة (Admin/Operator)
- حماية API endpoints

### 🖨️ إدارة الطابعات
- مراقبة حالة الطابعات في الوقت الفعلي
- عرض معلومات البطارية ودرجة الحرارة
- تتبع موقع وحالة كل طابعة

### 🔄 إدارة الفيرموير
- رفع ملفات الفيرموير إلى Supabase Storage أو Google Drive
- نشر التحديثات على طابعات محددة
- مراقبة تقدم التحديث

### 📊 تاريخ التحديثات
- سجل كامل لجميع التحديثات
- إحصائيات نجاح/فشل التحديثات
- تفاصيل كل عملية تحديث

## التقنيات المستخدمة

### Frontend
- React 18 مع TypeScript
- Tailwind CSS للتصميم
- Lucide React للأيقونات
- Vite كأداة البناء

### Backend
- Node.js مع Express
- JWT للمصادقة
- Multer لرفع الملفات
- bcryptjs لتشفير كلمات المرور

### Cloud Services
- **Vercel** - استضافة التطبيق
- **Supabase** - قاعدة البيانات وتخزين الملفات
- **Google Drive** - تخزين احتياطي للملفات

## API Endpoints

### المصادقة
- `POST /api/auth/login` - تسجيل الدخول
- `POST /api/auth/logout` - تسجيل الخروج
- `GET /api/auth/verify` - التحقق من صحة الـ token

### الطابعات
- `GET /api/printers` - الحصول على جميع الطابعات
- `GET /api/printers/:id` - الحصول على طابعة محددة
- `PUT /api/printers/:id` - تحديث طابعة (Admin only)
- `POST /api/printers` - إضافة طابعة جديدة (Admin only)
- `DELETE /api/printers/:id` - حذف طابعة (Admin only)

### الفيرموير
- `GET /api/firmware` - الحصول على تحديثات الفيرموير (Admin only)
- `POST /api/firmware/upload` - رفع فيرموير جديد (Admin only)
- `POST /api/firmware/:id/deploy` - نشر تحديث (Admin only)
- `POST /api/firmware/:id/cancel` - إلغاء نشر (Admin only)
- `GET /api/firmware/storage/status` - حالة خدمات التخزين

### التاريخ
- `GET /api/history` - الحصول على تاريخ التحديثات
- `POST /api/history` - إضافة سجل جديد (Admin only)
- `GET /api/history/stats/overview` - إحصائيات التحديثات

## بيانات الدخول التجريبية

### المدير
- اسم المستخدم: `admin`
- كلمة المرور: `admin123`

### المشغل
- اسم المستخدم: `operator`
- كلمة المرور: `op123`

## الأمان

- جميع API endpoints محمية بـ JWT
- تشفير كلمات المرور باستخدام bcrypt
- التحقق من نوع الملفات المرفوعة
- حد أقصى لحجم الملفات (50MB)
- CORS محدود للنطاقات المصرح بها

## المساهمة

مرحب بالمساهمات! يرجى إنشاء Pull Request أو فتح Issue للمناقشة.

## الترخيص

هذا المشروع مرخص تحت رخصة MIT.