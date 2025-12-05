const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, 'database.sqlite');

// 数据库操作封装（提前定义，供初始化使用）
const dbOperations = {
  // 执行查询
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  },

  // 执行单行查询
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  // 执行插入/更新/删除
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }
};

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('✅ 数据库连接成功');
    initDatabase();
  }
});

// 初始化数据库表
async function initDatabase() {
  try {
    // 邮箱设置表
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS email_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      smtp_host TEXT NOT NULL,
      smtp_port INTEGER NOT NULL,
      pop_host TEXT,
      pop_port INTEGER,
      email TEXT NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      secure BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 联系人分组表
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS customer_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`);

    // 联系人表
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      company TEXT,
      phone TEXT,
      group_id INTEGER NULL,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES customer_groups (id)
    )`);

    // 邮件模板表
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      attachments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 发送记录表
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS send_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      email_subject TEXT NOT NULL,
      email_content TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id),
      FOREIGN KEY (template_id) REFERENCES email_templates (id)
    )`);

    // 插入默认分组
    await dbOperations.run(`INSERT OR IGNORE INTO customer_groups (id, name) VALUES
      (1, '潜在联系人'),
      (2, '现有联系人'),
      (3, 'VIP联系人')`);

    // 给联系人表增加 group_id 字段（如果没有）
    let columns = await dbOperations.query("PRAGMA table_info(customers)");
    if (!Array.isArray(columns)) columns = [];
    if (!columns.some(col => col.name === 'group_id')) {
      await dbOperations.run("ALTER TABLE customers ADD COLUMN group_id INTEGER NULL");
    }

    // 给联系人表增加 first_name 和 last_name 字段（如果没有）
    columns = await dbOperations.query("PRAGMA table_info(customers)");
    if (!Array.isArray(columns)) columns = [];

    if (!columns.some(col => col.name === 'first_name')) {
      await dbOperations.run("ALTER TABLE customers ADD COLUMN first_name TEXT");
    }

    if (!columns.some(col => col.name === 'last_name')) {
      await dbOperations.run("ALTER TABLE customers ADD COLUMN last_name TEXT");
    }

    // 迁移现有数据：将 name 字段拆分为 first_name 和 last_name
    const existingCustomers = await dbOperations.query("SELECT id, name, first_name, last_name FROM customers WHERE name IS NOT NULL");
    for (const customer of existingCustomers) {
      const name = customer.name || '';
      let firstName = '';
      let lastName = '';

      // 判断是否包含空格（英文名字）
      if (name.includes(' ')) {
        // 英文名字：空格分隔，最后一个词是姓氏
        const parts = name.trim().split(/\s+/);
        if (parts.length > 1) {
          lastName = parts[parts.length - 1]; // 最后一个词是姓氏
          firstName = parts.slice(0, -1).join(' '); // 其余是名字
        } else {
          firstName = parts[0];
        }
      } else {
        // 中文名字：第一个字符是姓氏，其余是名字
        lastName = name.charAt(0) || '';
        firstName = name.slice(1) || '';
      }

      await dbOperations.run(
        "UPDATE customers SET first_name = ?, last_name = ? WHERE id = ?",
        [firstName, lastName, customer.id]
      );
    }

    console.log('✅ 数据库表初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  }
}

module.exports = { db, dbOperations };