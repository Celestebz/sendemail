#!/bin/bash

echo "🚀 启动批量发邮件工具..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到npm，请先安装npm"
    exit 1
fi

echo "✅ Node.js和npm已安装"

# 安装依赖
echo "📦 安装项目依赖..."
npm run install-all

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 启动应用
echo "🌟 启动应用..."
npm run dev

echo "✅ 应用启动完成！"
echo "📧 前端地址: http://localhost:3000"
echo "🔧 后端地址: http://localhost:5000"
echo ""
echo "💡 使用说明:"
echo "1. 打开浏览器访问 http://localhost:3000"
echo "2. 在'系统设置'页面配置企业邮箱"
echo "3. 在'客户管理'页面添加客户信息"
echo "4. 在'邮件模板'页面创建邮件模板"
echo "5. 在'发送邮件'页面进行批量发送" 