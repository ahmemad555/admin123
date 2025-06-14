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
  }
};