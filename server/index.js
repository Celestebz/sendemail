const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 导入路由
const emailRoutes = require('./routes/email');
const customerRoutes = require('./routes/customers');
const templateRoutes = require('./routes/templates');
const settingsRoutes = require('./routes/settings');
const groupRoutes = require('./routes/groups');

const app = express();
const PORT = process.env.PORT || 5001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 确保图片上传目录存在
const imagesDir = path.join(__dirname, 'uploads', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// 路由
app.use('/api/email', emailRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/groups', groupRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '批量发邮件服务运行正常' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: err.message 
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📧 批量发邮件工具后端服务已启动`);
}); 