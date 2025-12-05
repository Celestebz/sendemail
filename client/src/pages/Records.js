import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Row, Col, Statistic, DatePicker, Space, Modal
} from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const { RangePicker } = DatePicker;

const Records = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ overview: {}, dailyStats: [], templateStats: [] });
  const [dateRange, setDateRange] = useState([]);
  const [failModal, setFailModal] = useState({ open: false, reason: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchStats();
    fetchRecords(page, pageSize);
    // eslint-disable-next-line
  }, [dateRange, page, pageSize]);

  const fetchStats = async () => {
    try {
      const params = {};
      if (dateRange.length === 2) {
        params.start_date = dayjs(dateRange[0]).format('YYYY-MM-DD');
        params.end_date = dayjs(dateRange[1]).format('YYYY-MM-DD');
      }
      const res = await axios.get('/api/email/statistics', { params });
      setStats(res.data.data || {});
    } catch (error) {
      // ignore
    }
  };

  const fetchRecords = async (pageArg = page, pageSizeArg = pageSize) => {
    setLoading(true);
    try {
      const params = { page: pageArg, pageSize: pageSizeArg };
      if (dateRange.length === 2) {
        params.start_date = dayjs(dateRange[0]).format('YYYY-MM-DD');
        params.end_date = dayjs(dateRange[1]).format('YYYY-MM-DD');
      }
      const res = await axios.get('/api/email/records', { params });
      setRecords(res.data.data?.records || []);
      setTotal(res.data.data?.total || 0);
    } catch (error) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '联系人',
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
      title: '主题',
      dataIndex: 'email_subject',
      key: 'email_subject',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Tag color={status === 'success' ? 'green' : 'red'}>
          {status === 'success' ? '成功' : (
            <span style={{ cursor: 'pointer' }} onClick={() => setFailModal({ open: true, reason: record.error_message })}>
              失败 <ExclamationCircleOutlined />
            </span>
          )}
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
        <h1 className="page-title">发送记录</h1>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card className="stats-card">
            <Statistic
              title="总发送量"
              value={stats.overview?.total || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stats-card">
            <Statistic
              title="成功数量"
              value={stats.overview?.success || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stats-card">
            <Statistic
              title="失败数量"
              value={stats.overview?.failed || 0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stats-card">
            <Statistic
              title="成功率"
              value={stats.overview?.successRate || 0}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 时间筛选和趋势图 */}
      <Card className="content-card" style={{ marginBottom: 16 }}>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            allowClear
            style={{ marginBottom: 8 }}
          />
        </Space>
        <div style={{ height: 300, marginTop: 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.dailyStats || []}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#1890ff" name="总数" />
              <Line type="monotone" dataKey="success" stroke="#52c41a" name="成功" />
              <Line type="monotone" dataKey="failed" stroke="#ff4d4f" name="失败" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 按模板统计 */}
      <Card className="content-card" style={{ marginBottom: 16 }}>
        <h3>按模板统计</h3>
        <Table
          columns={[
            { title: '模板', dataIndex: 'template_name', key: 'template_name' },
            { title: '总数', dataIndex: 'total', key: 'total' },
            { title: '成功', dataIndex: 'success', key: 'success' },
            { title: '失败', dataIndex: 'failed', key: 'failed' },
          ]}
          dataSource={stats.templateStats || []}
          rowKey="template_name"
          pagination={false}
          size="small"
        />
      </Card>

      {/* 历史记录表格 */}
      <Card className="content-card">
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['20', '50', '100', '200'],
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={(pagination) => {
            setPage(pagination.current);
            setPageSize(pagination.pageSize);
          }}
        />
      </Card>

      {/* 失败原因弹窗 */}
      <Modal
        title="失败原因"
        open={failModal.open}
        onCancel={() => setFailModal({ open: false, reason: '' })}
        footer={null}
      >
        <p>{failModal.reason}</p>
      </Modal>
    </div>
  );
};

export default Records;