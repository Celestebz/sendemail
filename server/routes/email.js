const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { dbOperations } = require('../database');

const router = express.Router();

// 发送邮件
router.post('/send', async (req, res) => {
  try {
    const { customerIds, templateId, customSubject, customContent } = req.body;
    
    // 获取邮箱设置
    const emailSettings = await dbOperations.get('SELECT * FROM email_settings LIMIT 1');
    if (!emailSettings) {
      return res.status(400).json({ success: false, error: '请先配置邮箱设置' });
    }

    // 调试信息：输出邮箱设置（隐藏密码）
    console.log('📧 邮箱设置:', {
      smtp_host: emailSettings.smtp_host,
      smtp_port: emailSettings.smtp_port,
      email: emailSettings.email,
      username: emailSettings.username,
      secure: emailSettings.smtp_secure,
      password: emailSettings.password ? '***' : '未设置'
    });

    // 获取模板
    const template = await dbOperations.get('SELECT * FROM email_templates WHERE id = ?', [templateId]);
    if (!template) {
      return res.status(400).json({ success: false, error: '模板不存在' });
    }

    // 获取客户列表
    const customers = await dbOperations.query('SELECT * FROM customers WHERE id IN (' + customerIds.map(() => '?').join(',') + ')', customerIds);
    if (customers.length === 0) {
      return res.status(400).json({ success: false, error: '未找到客户' });
    }

    // 创建邮件传输器
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtp_host,
      port: emailSettings.smtp_port,
      secure: emailSettings.smtp_port === 465, // 端口465必须使用SSL
      auth: {
        user: emailSettings.username,
        pass: emailSettings.password,
      }
    });

    // 调试信息：输出SMTP配置
    console.log('🔧 SMTP配置:', {
      host: emailSettings.smtp_host,
      port: emailSettings.smtp_port,
      secure: emailSettings.smtp_port === 465,
      auth_user: emailSettings.username
    });

    // 发送结果统计
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // 批量发送邮件
    for (const customer of customers) {
      try {
        // 变量替换
        let subject = customSubject || template.subject;
        let content = customContent || template.content;
        
        subject = subject.replace(/\{\{客户姓名\}\}/g, customer.name)
                        .replace(/\{\{公司名称\}\}/g, customer.company || '')
                        .replace(/\{\{邮箱\}\}/g, customer.email)
                        .replace(/\{\{电话\}\}/g, customer.phone || '');

        content = content.replace(/\{\{客户姓名\}\}/g, customer.name)
                        .replace(/\{\{公司名称\}\}/g, customer.company || '')
                        .replace(/\{\{邮箱\}\}/g, customer.email)
                        .replace(/\{\{电话\}\}/g, customer.phone || '');

        // 处理附件
        let attachments = [];
        if (template.attachments) {
          const attachmentFiles = JSON.parse(template.attachments);
          attachments = attachmentFiles.map(file => ({
            filename: file.filename,
            path: file.path,
            contentDisposition: `attachment; filename="${file.filename}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`
          }));
        }

        // 发送邮件
        await transporter.sendMail({
          from: emailSettings.email,
          to: customer.email,
          subject: subject,
          text: content,
          attachments: attachments
        });
        
        // 记录发送成功
        await dbOperations.run(
          `INSERT INTO send_records 
           (customer_id, template_id, email_subject, email_content, status, sent_at) 
           VALUES (?, ?, ?, ?, 'success', datetime('now', 'localtime'))`,
          [customer.id, templateId, subject, content]
        );

        results.success++;
      } catch (error) {
        // 彻底兜底，避免 NOT NULL 约束错误，并输出调试信息
        console.error('邮件发送失败', { customSubject, template, error });
        const safeSubject = (typeof customSubject === 'string' && customSubject.trim())
          || (template && typeof template.subject === 'string' && template.subject.trim())
          || '（无主题）';
        const safeContent = (typeof customContent === 'string' && customContent.trim())
          || (template && typeof template.content === 'string' && template.content.trim())
          || '（无内容）';
        await dbOperations.run(
          `INSERT INTO send_records 
           (customer_id, template_id, email_subject, email_content, status, error_message, sent_at) 
           VALUES (?, ?, ?, ?, 'failed', ?, datetime('now', 'localtime'))`,
          [customer.id, templateId, safeSubject, safeContent, error.message]
        );

        results.failed++;
        results.errors.push({
          customer: customer.name,
          email: customer.email,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        total: customers.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取发送记录
router.get('/records', async (req, res) => {
  try {
    const { start_date, end_date, page = 1, pageSize = 100 } = req.query;
    let whereClause = '';
    let params = [];
    
    if (start_date && end_date) {
      whereClause = 'WHERE DATE(sr.sent_at) BETWEEN ? AND ?';
      params = [start_date, end_date];
    }
    
    // 获取总数
    const totalResult = await dbOperations.get(`
      SELECT COUNT(*) as total
      FROM send_records sr
      LEFT JOIN customers c ON sr.customer_id = c.id
      LEFT JOIN email_templates t ON sr.template_id = t.id
      ${whereClause}
    `, params);
    const total = totalResult.total || 0;

    // 分页
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const records = await dbOperations.query(`
      SELECT sr.*, c.name as customer_name, c.email as customer_email, t.name as template_name
      FROM send_records sr
      LEFT JOIN customers c ON sr.customer_id = c.id
      LEFT JOIN email_templates t ON sr.template_id = t.id
      ${whereClause}
      ORDER BY sr.sent_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    res.json({ success: true, data: { records, total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取详细统计
router.get('/statistics', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let whereClause = '';
    let params = [];
    
    if (start_date && end_date) {
      whereClause = 'WHERE DATE(sent_at) BETWEEN ? AND ?';
      params = [start_date, end_date];
    }
    
    // 总体统计
    const totalQuery = `SELECT COUNT(*) as total FROM send_records ${whereClause}`;
    const successQuery = `SELECT COUNT(*) as success FROM send_records WHERE status = 'success' ${whereClause}`;
    const failedQuery = `SELECT COUNT(*) as failed FROM send_records WHERE status = 'failed' ${whereClause}`;
    
    const total = await dbOperations.get(totalQuery, params);
    const success = await dbOperations.get(successQuery, params);
    const failed = await dbOperations.get(failedQuery, params);
    
    const successRate = total.total > 0 ? Math.round((success.success / total.total) * 100) : 0;
    
    // 每日统计
    const dailyStats = await dbOperations.query(`
      SELECT 
        DATE(sent_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM send_records
      ${whereClause}
      GROUP BY DATE(sent_at)
      ORDER BY date DESC
      LIMIT 30
    `, params);
    
    // 按模板统计
    const templateStats = await dbOperations.query(`
      SELECT 
        t.name as template_name,
        COUNT(*) as total,
        SUM(CASE WHEN sr.status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN sr.status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM send_records sr
      LEFT JOIN email_templates t ON sr.template_id = t.id
      ${whereClause}
      GROUP BY sr.template_id, t.name
      ORDER BY total DESC
    `, params);
    
    res.json({
      success: true,
      data: {
        overview: {
          total: total.total,
          success: success.success,
          failed: failed.failed,
          successRate
        },
        dailyStats,
        templateStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取发送统计
router.get('/stats', async (req, res) => {
  try {
    const totalSent = await dbOperations.get('SELECT COUNT(*) as count FROM send_records WHERE status = "success"');
    const totalFailed = await dbOperations.get('SELECT COUNT(*) as count FROM send_records WHERE status = "failed"');
    const todaySent = await dbOperations.get('SELECT COUNT(*) as count FROM send_records WHERE status = "success" AND DATE(sent_at) = DATE("now")');
    
    res.json({
      success: true,
      data: {
        totalSent: totalSent.count,
        totalFailed: totalFailed.count,
        todaySent: todaySent.count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 