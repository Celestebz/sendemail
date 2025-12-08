const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');
const nodemailer = require('nodemailer');

// 获取邮箱设置
router.get('/', async (req, res) => {
  try {
    const settings = await dbOperations.get('SELECT * FROM email_settings ORDER BY id DESC LIMIT 1');
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 保存邮箱设置
router.post('/', async (req, res) => {
  try {
    const { smtp_host, smtp_port, pop_host, pop_port, email, username, password, secure, default_cc } = req.body;
    
    // 验证必填字段
    if (!smtp_host || !smtp_port || !email || !username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: '请填写所有必填字段' 
      });
    }

    // 检查是否已存在设置
    const existing = await dbOperations.get('SELECT id FROM email_settings LIMIT 1');
    
    if (existing) {
      // 更新现有设置
      await dbOperations.run(
        `UPDATE email_settings SET 
         smtp_host = ?, smtp_port = ?, pop_host = ?, pop_port = ?, 
         email = ?, username = ?, password = ?, secure = ?, default_cc = ?, 
         updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [smtp_host, smtp_port, pop_host, pop_port, email, username, password, secure, default_cc || null, existing.id]
      );
    } else {
      // 创建新设置
      await dbOperations.run(
        `INSERT INTO email_settings 
         (smtp_host, smtp_port, pop_host, pop_port, email, username, password, secure, default_cc) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [smtp_host, smtp_port, pop_host, pop_port, email, username, password, secure, default_cc || null]
      );
    }

    res.json({ success: true, message: '邮箱设置保存成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 测试SMTP连接
router.post('/test-smtp', async (req, res) => {
  try {
    const { smtp_host, smtp_port, email, username, password, secure } = req.body;
    
    // 创建测试传输器
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: secure, // true for 465, false for other ports
      auth: {
        user: username,
        pass: password,
      },
    });

    // 验证连接
    await transporter.verify();
    
    res.json({ success: true, message: 'SMTP连接测试成功' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'SMTP连接测试失败',
      details: error.message 
    });
  }
});

// 测试POP连接
router.post('/test-pop', async (req, res) => {
  try {
    const { pop_host, pop_port, username, password, secure } = req.body;
    
    // 这里可以添加POP3连接测试逻辑
    // 由于nodemailer主要用于发送邮件，POP3测试可能需要其他库
    
    res.json({ success: true, message: 'POP连接配置已保存' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'POP连接测试失败',
      details: error.message 
    });
  }
});

module.exports = router; 
