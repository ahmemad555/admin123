# FOTA System for Concrete 3D Printing

نظام إدارة التحديثات عن بُعد (FOTA) لطابعات الخرسانة ثلاثية الأبعاد

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
- رفع ملفات الفيرموير الجديدة
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

## التشغيل

### تشغيل الواجهة الأمامية
```bash
npm run dev
```

### تشغيل السيرفر
```bash
npm run server
```

### تشغيل السيرفر مع إعادة التحميل التلقائي
```bash
npm run dev:server
```

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

## التطوير المستقبلي

- [ ] قاعدة بيانات حقيقية (PostgreSQL/MySQL)
- [ ] WebSocket للتحديثات المباشرة
- [ ] نظام إشعارات
- [ ] تقارير مفصلة
- [ ] نسخ احتياطية للفيرموير
- [ ] API للطابعات للاتصال المباشر

## المساهمة

مرحب بالمساهمات! يرجى إنشاء Pull Request أو فتح Issue للمناقشة.

## الترخيص

هذا المشروع مرخص تحت رخصة MIT.