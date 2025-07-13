import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import { UserOutlined, MailOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    customers: 0,
    templates: 0,
    totalSent: 0,
    successRate: 0
  });
  const [recentRecords, setRecentRecords] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 获取客户数量
      const customersRes = await axios.get('/api/customers');
      const customersCount = customersRes.data.data?.length || 0;

      // 获取模板数量
      const templatesRes = await axios.get('/api/templates');
      const templatesCount = templatesRes.data.data?.length || 0;

      // 获取发送统计
      const statsRes = await axios.get('/api/email/statistics');
      const emailStats = statsRes.data.data?.overview || {};

      setStats({
        customers: customersCount,
        templates: templatesCount,
        totalSent: emailStats.total || 0,
        successRate: emailStats.successRate || 0
      });

      // 获取最近发送记录
      const recordsRes = await axios.get('/api/email/records?limit=5');
      setRecentRecords(recordsRes.data.data?.records || []);
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
    }
  };

  const recentColumns = [
    {
      title: '客户',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: '邮箱',
      dataIndex: 'customer_email',
      key: 'customer_email',
    },
    {
      title: '模板',
      dataIndex: 'template_name',
      key: 'template_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'success' ? 'green' : 'red'}>
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '发送时间',
      dataIndex: 'sent_at',
      key: 'sent_at',
      render: (time) => time ? new Date(time).toLocaleString() : '-',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">仪表板</h1>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card className="stats-card">
            <Statistic
              title="客户总数"
              value={stats.customers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stats-card">
            <Statistic
              title="邮件模板"
              value={stats.templates}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stats-card">
            <Statistic
              title="总发送量"
              value={stats.totalSent}
              prefix={<MailOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stats-card">
            <Statistic
              title="发送成功率"
              value={stats.successRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近发送记录" className="content-card">
        <Table
          columns={recentColumns}
          dataSource={recentRecords}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default Dashboard; 