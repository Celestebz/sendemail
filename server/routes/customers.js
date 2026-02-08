const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');
const multer = require('multer');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// 获取上传目录路径（与 index.js 和 database.js 保持一致）
const getDataDir = () => {
  if (process.pkg) {
    return path.join(path.dirname(process.execPath), 'data');
  } else {
    return path.join(__dirname, '..', '..', 'data');
  }
};

const uploadsDir = path.join(getDataDir(), 'uploads');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
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



// 创建联系人
router.post('/', async (req, res) => {
  try {
    const { name, first_name, last_name, email, company, phone, group_id, notes } = req.body;

    // 支持新旧两种方式
    let finalFirstName = first_name;
    let finalLastName = last_name;
    let finalName = name;

    // 如果提供了 first_name 和 last_name，组合成 name（英文名习惯：名字 + 空格 + 姓氏）
    if (first_name || last_name) {
      const parts = [];
      if (first_name) parts.push(first_name.trim());
      if (last_name) parts.push(last_name.trim());
      finalName = parts.join(' ');
    } else if (name) {
      // 如果只提供了 name，拆分为 first_name 和 last_name
      if (name.includes(' ')) {
        // 英文名字：空格分隔
        const nameParts = name.trim().split(/\s+/);
        if (nameParts.length > 1) {
          finalLastName = nameParts[nameParts.length - 1];
          finalFirstName = nameParts.slice(0, -1).join(' ');
        } else {
          finalFirstName = nameParts[0];
        }
      } else {
        // 中文名字：第一个字符是姓氏
        finalLastName = name.charAt(0) || '';
        finalFirstName = name.slice(1) || '';
      }
    }

    if (!finalName || !email) {
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
      `INSERT INTO customers (name, first_name, last_name, email, company, phone, group_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [finalName, finalFirstName, finalLastName, email, company, phone, group_id, notes]
    );

    res.json({
      success: true,
      message: '联系人创建成功',
      data: { id: result.id }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新联系人
router.put('/:id', async (req, res) => {
  try {
    const { name, first_name, last_name, email, company, phone, group_id, notes, status } = req.body;

    // 支持新旧两种方式
    let finalFirstName = first_name;
    let finalLastName = last_name;
    let finalName = name;

    // 如果提供了 first_name 和 last_name，组合成 name（英文名习惯：名字 + 空格 + 姓氏）
    if (first_name || last_name) {
      const parts = [];
      if (first_name) parts.push(first_name.trim());
      if (last_name) parts.push(last_name.trim());
      finalName = parts.join(' ');
    } else if (name) {
      // 如果只提供了 name，拆分为 first_name 和 last_name
      if (name.includes(' ')) {
        // 英文名字：空格分隔
        const nameParts = name.trim().split(/\s+/);
        if (nameParts.length > 1) {
          finalLastName = nameParts[nameParts.length - 1];
          finalFirstName = nameParts.slice(0, -1).join(' ');
        } else {
          finalFirstName = nameParts[0];
        }
      } else {
        // 中文名字：第一个字符是姓氏
        finalLastName = name.charAt(0) || '';
        finalFirstName = name.slice(1) || '';
      }
    }

    if (!finalName || !email) {
      return res.status(400).json({
        success: false,
        error: '姓名和邮箱为必填字段'
      });
    }

    // 检查邮箱是否已被其他联系人使用
    const existing = await dbOperations.get(
      'SELECT id FROM customers WHERE email = ? AND id != ?',
      [email, req.params.id]
    );
    if (existing) {
      return res.status(400).json({
        success: false,
        error: '该邮箱已被其他联系人使用'
      });
    }

    await dbOperations.run(
      `UPDATE customers SET
       name = ?, first_name = ?, last_name = ?, email = ?, company = ?, phone = ?, group_id = ?, notes = ?, status = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [finalName, finalFirstName, finalLastName, email, company, phone, group_id, notes, status, req.params.id]
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

    // 检查字段名：允许 "姓名" 或拆分的 "名字"+"姓氏"
    if (customers.length > 0) {
      const header = customers[0];
      const hasFullNameHeader = ('姓名' in header);
      const hasSplitNameHeader = ('名字' in header) && ('姓氏' in header);
      const hasEmailHeader = ('邮箱' in header);
      if ((!hasFullNameHeader && !hasSplitNameHeader) || !hasEmailHeader) {
        return res.status(400).json({
          success: false,
          error: '导入文件缺少姓名相关或邮箱表头。请使用“姓名, 邮箱”或“名字, 姓氏, 邮箱”中文表头（无空格）。'
        });
      }
    }

    // 验证和插入数据
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const customer of customers) {
      try {
        const { 姓名: name, 名字: first_name_from_file, 姓氏: last_name_from_file, 邮箱: email, 公司: company, 电话: phone, 分组: group_name, 备注: notes } = customer;
        
        // 计算 first_name / last_name
        let finalFirstName = first_name_from_file || '';
        let finalLastName = last_name_from_file || '';
        let finalName = name || '';
        if (!finalName && (finalFirstName || finalLastName)) {
          finalName = [finalFirstName, finalLastName].filter(Boolean).join(' ').trim();
        }
        if (!finalFirstName || !finalLastName) {
          const baseName = finalName || '';
          if (baseName) {
            if (baseName.includes(' ')) {
              const parts = baseName.trim().split(/\s+/);
              if (!finalLastName) finalLastName = parts[parts.length - 1] || '';
              if (!finalFirstName) finalFirstName = parts.slice(0, -1).join(' ') || parts[0] || '';
            } else {
              // 中文：第一个字符为姓氏，其余为名字
              if (!finalLastName) finalLastName = baseName.charAt(0) || '';
              if (!finalFirstName) finalFirstName = baseName.slice(1) || '';
            }
          }
        }
        // 宽松判断空行，只要姓名或邮箱有值就导入
        if (!finalName && !email) {
          continue;
        }

        if (!finalName || !email) {
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
          `INSERT INTO customers (name, first_name, last_name, email, company, phone, group_id, notes) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [finalName, finalFirstName, finalLastName, email, company, phone, group_id, notes]
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
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 导出模板
router.get('/template/download', async (req, res) => {
  try {
    const workbook = xlsx.utils.book_new();
    const headers = [
      ['名字', '姓氏', '邮箱', '公司', '电话', '分组', '备注']
    ];
    const examples = [
      ['John', 'Smith', 'john@example.com', 'Example Corp', '123456789', 'VIP客户', '这是一个示例'],
      ['李', '四', 'lisi@example.com', '测试公司', '13800138000', '潜在客户', ''],
    ];

    const worksheet = xlsx.utils.aoa_to_sheet([...headers, ...examples]);
    
    // 设置列宽
    worksheet['!cols'] = [
      { wch: 15 }, // 名字
      { wch: 15 }, // 姓氏
      { wch: 25 }, // 邮箱
      { wch: 20 }, // 公司
      { wch: 15 }, // 电话
      { wch: 15 }, // 分组
      { wch: 30 }  // 备注
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, '导入模板');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=contact_template.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 
