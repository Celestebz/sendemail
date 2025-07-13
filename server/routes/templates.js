const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');
const multer = require('multer');
const path = require('path');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  }
});

// 获取所有模板
router.get('/', async (req, res) => {
  try {
    const templates = await dbOperations.query(
      'SELECT * FROM email_templates ORDER BY created_at DESC'
    );
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个模板
router.get('/:id', async (req, res) => {
  try {
    const template = await dbOperations.get(
      'SELECT * FROM email_templates WHERE id = ?',
      [req.params.id]
    );
    
    if (!template) {
      return res.status(404).json({ success: false, error: '模板不存在' });
    }
    
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建模板
router.post('/', upload.array('attachments', 5), async (req, res) => {
  try {
    const { name, subject, content } = req.body;
    
    if (!name || !subject || !content) {
      return res.status(400).json({ 
        success: false, 
        error: '模板名称、主题和内容为必填字段' 
      });
    }

    // 处理附件
    let attachments = null;
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path
      }));
    }

    const result = await dbOperations.run(
      `INSERT INTO email_templates (name, subject, content, attachments) 
       VALUES (?, ?, ?, ?)`,
      [name, subject, content, attachments ? JSON.stringify(attachments) : null]
    );

    res.json({ 
      success: true, 
      message: '模板创建成功',
      data: { id: result.id }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新模板
router.put('/:id', upload.array('attachments', 5), async (req, res) => {
  try {
    const { name, subject, content } = req.body;
    
    if (!name || !subject || !content) {
      return res.status(400).json({ 
        success: false, 
        error: '模板名称、主题和内容为必填字段' 
      });
    }

    // 获取现有模板信息
    const existingTemplate = await dbOperations.get(
      'SELECT attachments FROM email_templates WHERE id = ?',
      [req.params.id]
    );

    // 处理附件
let attachments = null;
// 统一处理现有附件
const existingAttachments = [];
if (req.body.existingAttachments) {
  const existingData = Array.isArray(req.body.existingAttachments)
    ? req.body.existingAttachments
    : [req.body.existingAttachments];
  existingData.forEach(item => {
    if (typeof item === 'string') {
      try {
        const parsed = JSON.parse(item);
        existingAttachments.push(parsed);
      } catch (e) {
        console.log('解析现有附件信息失败:', item);
      }
    }
  });
}
// 新上传的附件
const newAttachments = req.files && req.files.length > 0
  ? req.files.map(file => ({
      filename: file.originalname,
      path: file.path
    }))
  : [];
// 合并并保存
attachments = JSON.stringify([...existingAttachments, ...newAttachments]);
console.log('📎 最终保存附件:', attachments);

    await dbOperations.run(
      `UPDATE email_templates SET 
       name = ?, subject = ?, content = ?, attachments = ?, 
       updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name, subject, content, attachments, req.params.id]
    );

    res.json({ success: true, message: '模板更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除模板
router.delete('/:id', async (req, res) => {
  try {
    await dbOperations.run('DELETE FROM email_templates WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '模板删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 预览模板（变量替换）
router.post('/:id/preview', async (req, res) => {
  try {
    const { customerData } = req.body;
    
    const template = await dbOperations.get(
      'SELECT * FROM email_templates WHERE id = ?',
      [req.params.id]
    );
    
    if (!template) {
      return res.status(404).json({ success: false, error: '模板不存在' });
    }

    // 变量替换
    let previewSubject = template.subject;
    let previewContent = template.content;

    if (customerData) {
      const variables = {
        '{{客户姓名}}': customerData.name || '',
        '{{公司名称}}': customerData.company || '',
        '{{邮箱}}': customerData.email || '',
        '{{电话}}': customerData.phone || ''
      };

      Object.keys(variables).forEach(key => {
        const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        previewSubject = previewSubject.replace(regex, variables[key]);
        previewContent = previewContent.replace(regex, variables[key]);
      });
    }

    res.json({ 
      success: true, 
      data: {
        subject: previewSubject,
        content: previewContent,
        attachments: template.attachments ? JSON.parse(template.attachments) : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 