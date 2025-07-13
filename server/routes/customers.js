const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');
const multer = require('multer');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');

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
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('只支持Excel和CSV文件'));
    }
  }
});

// 获取所有客户
router.get('/', async (req, res) => {
  try {
    const { group_id, status, search } = req.query;
    let sql = `
      SELECT c.*, g.name as group_name 
      FROM customers c 
      LEFT JOIN customer_groups g ON c.group_id = g.id 
      WHERE 1=1
    `;
    const params = [];

    if (group_id) {
      sql += ' AND c.group_id = ?';
      params.push(group_id);
    }

    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (c.name LIKE ? OR c.email LIKE ? OR c.company LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY c.created_at DESC';

    const customers = await dbOperations.query(sql, params);
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});



// 创建客户
router.post('/', async (req, res) => {
  try {
    const { name, email, company, phone, group_id, notes } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        error: '姓名和邮箱为必填字段' 
      });
    }

    // 检查邮箱是否已存在
    const existing = await dbOperations.get('SELECT id FROM customers WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: '该邮箱已存在' 
      });
    }

    const result = await dbOperations.run(
      `INSERT INTO customers (name, email, company, phone, group_id, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, company, phone, group_id, notes]
    );

    res.json({ 
      success: true, 
      message: '客户创建成功',
      data: { id: result.id }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新客户
router.put('/:id', async (req, res) => {
  try {
    const { name, email, company, phone, group_id, notes, status } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        error: '姓名和邮箱为必填字段' 
      });
    }

    // 检查邮箱是否已被其他客户使用
    const existing = await dbOperations.get(
      'SELECT id FROM customers WHERE email = ? AND id != ?', 
      [email, req.params.id]
    );
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: '该邮箱已被其他客户使用' 
      });
    }

    await dbOperations.run(
      `UPDATE customers SET 
       name = ?, email = ?, company = ?, phone = ?, group_id = ?, notes = ?, status = ?, 
       updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name, email, company, phone, group_id, notes, status, req.params.id]
    );

    res.json({ success: true, message: '客户更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除客户
router.delete('/:id', async (req, res) => {
  try {
    await dbOperations.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '客户删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取客户分组
router.get('/groups', async (req, res) => {
  try {
    const groups = await dbOperations.query('SELECT * FROM customer_groups ORDER BY name');
    res.json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个客户
router.get('/:id', async (req, res) => {
  try {
    const customer = await dbOperations.get(
      `SELECT c.*, g.name as group_name 
       FROM customers c 
       LEFT JOIN customer_groups g ON c.group_id = g.id 
       WHERE c.id = ?`,
      [req.params.id]
    );
    
    if (!customer) {
      return res.status(404).json({ success: false, error: '客户不存在' });
    }
    
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建客户分组
router.post('/groups', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: '分组名称为必填字段' 
      });
    }

    const result = await dbOperations.run(
      'INSERT INTO customer_groups (name, description) VALUES (?, ?)',
      [name, description]
    );

    res.json({ 
      success: true, 
      message: '分组创建成功',
      data: { id: result.id }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});



// 删除分组（组内客户自动移到未分组）
router.delete('/groups/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    // 先将组内客户 group_id 设为 null
    await dbOperations.run('UPDATE customers SET group_id = NULL WHERE group_id = ?', [groupId]);
    // 再删除分组
    await dbOperations.run('DELETE FROM customer_groups WHERE id = ?', [groupId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 导入客户数据
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: '请选择要导入的文件' 
      });
    }

    const filePath = req.file.path;
    const fileExt = req.file.originalname.split('.').pop().toLowerCase();
    let customers = [];

    if (fileExt === 'csv') {
      // 处理CSV文件
      const results = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
      customers = results;
    } else {
      // 处理Excel文件
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      customers = xlsx.utils.sheet_to_json(worksheet);
    }

    // 打印调试信息
    console.log('导入解析结果:', customers);

    // 检查字段名
    if (customers.length > 0 && (!('姓名' in customers[0]) || !('邮箱' in customers[0]))) {
      return res.status(400).json({
        success: false,
        error: '导入文件缺少"姓名"或"邮箱"表头，请检查表头是否为中文且无多余空格。'
      });
    }

    // 验证和插入数据
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const customer of customers) {
      try {
        const { 姓名: name, 邮箱: email, 公司: company, 电话: phone, 分组: group_name, 备注: notes } = customer;
        // 宽松判断空行，只要姓名或邮箱有值就导入
        if (!name && !email) {
          continue;
        }

        if (!name || !email) {
          errorCount++;
          errors.push(`行 ${customers.indexOf(customer) + 1}: 姓名和邮箱为必填字段`);
          continue;
        }

        // 检查邮箱是否已存在
        const existing = await dbOperations.get('SELECT id FROM customers WHERE email = ?', [email]);
        if (existing) {
          errorCount++;
          errors.push(`行 ${customers.indexOf(customer) + 1}: 邮箱 ${email} 已存在`);
          continue;
        }

        // 获取分组ID（自动创建分组）
        let group_id = null;
        if (group_name) {
          let group = await dbOperations.get('SELECT id FROM customer_groups WHERE name = ?', [group_name]);
          if (!group) {
            // 自动创建分组
            const groupResult = await dbOperations.run(
              'INSERT INTO customer_groups (name) VALUES (?)',
              [group_name]
            );
            group = { id: groupResult.id };
          }
          group_id = group.id;
        }

        await dbOperations.run(
          `INSERT INTO customers (name, email, company, phone, group_id, notes) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [name, email, company, phone, group_id, notes]
        );
        
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`行 ${customers.indexOf(customer) + 1}: ${error.message}`);
      }
    }

    // 删除临时文件
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `导入完成: 成功 ${successCount} 条，失败 ${errorCount} 条`,
      data: { successCount, errorCount, errors }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 导出客户数据
router.get('/export/csv', async (req, res) => {
  try {
    const customers = await dbOperations.query(`
      SELECT c.name, c.email, c.company, c.phone, g.name as group_name, c.notes, c.status, c.created_at
      FROM customers c 
      LEFT JOIN customer_groups g ON c.group_id = g.id 
      ORDER BY c.created_at DESC
    `);

    const csvData = customers.map(c => ({
      '姓名': c.name,
      '邮箱': c.email,
      '公司': c.company || '',
      '电话': c.phone || '',
      '分组': c.group_name || '',
      '备注': c.notes || '',
      '状态': c.status,
      '创建时间': c.created_at
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 