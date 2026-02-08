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

// 获取数据目录（与 database.js 保持一致）
const getDataDir = () => {
  if (process.pkg) {
    return path.join(path.dirname(process.execPath), 'data');
  } else {
    return path.join(__dirname, '..', 'data');
  }
};

const dataDir = getDataDir();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 使用 data 目录下的 uploads
const uploadsDir = path.join(dataDir, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// 确保上传目录存在
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 确保图片上传目录存在
const imagesDir = path.join(uploadsDir, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// 将 uploadsDir 挂载到 app 上，供路由使用
app.locals.uploadsDir = uploadsDir;

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

// 服务前端静态文件
// 打包后：使用 exe 所在目录的 client_build 文件夹
// 开发环境：使用项目的 client/build 文件夹
const getClientBuildPath = () => {
  if (process.pkg) {
    // 打包环境：exe 所在目录的 client_build
    // 注意：在 Windows 上 process.execPath 是 .exe 文件的完整路径
    // 使用 path.resolve 确保路径格式正确
    return path.resolve(path.dirname(process.execPath), 'client_build');
  } else {
    // 开发环境：项目的 client/build
    return path.join(__dirname, '..', 'client', 'build');
  }
};

const clientBuildPath = getClientBuildPath();
console.log(`📁 前端文件路径: ${clientBuildPath}`);

if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));

  // 所有非API请求都返回index.html（支持前端路由）
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // 如果没有构建文件，返回提示信息
  app.get('*', (req, res) => {
    res.status(404).json({
      error: '前端文件未找到',
      message: `前端文件路径: ${clientBuildPath}`,
      tip: '请确保 client_build 文件夹与 exe 在同一目录'
    });
  });
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📧 批量发邮件工具后端服务已启动`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);

  // 自动打开浏览器
  // 仅在打包环境下（process.pkg 为真）才自动打开浏览器
  // 开发环境下（npm run dev），前端由 React 开发服务器（端口 3000）自动打开
  if (process.pkg) {
    const url = `http://localhost:${PORT}`;
    const start = process.platform === 'darwin' ? 'open' :
                  process.platform === 'win32' ? 'start' : 'xdg-open';

    require('child_process').exec(`${start} ${url}`, (err) => {
      if (err) {
        console.log('⚠️  请手动打开浏览器访问:', url);
      } else {
        console.log('✅ 浏览器已自动打开');
      }
    });
  } else {
    console.log('ℹ️  开发模式：跳过自动打开浏览器（请访问前端端口 3000）');
  }
}); 
