import React, { useState, useEffect } from 'react';
import {
  Card, Button, Table, Modal, Select, message, Space, Tag, Row, Col, Spin
} from 'antd';
import { EyeOutlined, SendOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

const SendEmail = () => {
  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewList, setPreviewList] = useState([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchTemplates();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data.data || []);
    } catch (error) {
      message.error('获取联系人列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/templates');
      setTemplates(response.data.data || []);
    } catch (error) {
      message.error('获取模板列表失败');
    }
  };

  const handlePreview = async () => {
    if (!selectedTemplateId || selectedCustomerIds.length === 0) {
      message.warning('请选择模板和联系人');
      return;
    }
    setLoading(true);
    try {
      const template = templates.find(t => t.id === selectedTemplateId);
      const previews = await Promise.all(selectedCustomerIds.map(async id => {
        const customer = customers.find(c => c.id === id);
        const res = await axios.post(`/api/templates/${template.id}/preview`, { customerData: customer });
        return {
          customer,
          subject: res.data.data.subject,
          content: res.data.data.content,
          attachments: res.data.data.attachments || []
        };
      }));
      setPreviewList(previews);
      setPreviewVisible(true);
    } catch (error) {
      message.error('预览失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedTemplateId || selectedCustomerIds.length === 0) {
      message.warning('请选择模板和联系人');
      return;
    }
    setSending(true);
    try {
      const res = await axios.post('/api/email/send', {
        customerIds: selectedCustomerIds,
        templateId: selectedTemplateId
      });
      
      const { total, success, failed } = res.data.data;
      if (failed > 0) {
        message.warning(`发送完成！成功：${success}封，失败：${failed}封`);
      } else {
        message.success(`发送成功！共发送${total}封邮件`);
      }
      
      setPreviewVisible(false);
      setSelectedCustomerIds([]);
      setSelectedTemplateId(null);
    } catch (error) {
      message.error(error.response?.data?.error || '发送失败');
    } finally {
      setSending(false);
    }
  };

  const customerColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '公司',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: '分组',
      dataIndex: 'group_name',
      key: 'group_name',
      render: (groupName) => groupName ? <Tag color="blue">{groupName}</Tag> : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '活跃' : '非活跃'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">发送邮件</h1>
      </div>

      <Card className="content-card" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Select
              placeholder="请选择邮件模板"
              style={{ width: '100%' }}
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              allowClear
            >
              {templates.map(t => (
                <Option key={t.id} value={t.id}>{t.name}</Option>
              ))}
            </Select>
          </Col>
          <Col span={16}>
            <Space>
              <Button
                type="primary"
                icon={<EyeOutlined />}
                onClick={handlePreview}
                disabled={!selectedTemplateId || selectedCustomerIds.length === 0}
              >
                预览邮件
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={sending}
                disabled={!selectedTemplateId || selectedCustomerIds.length === 0}
              >
                批量发送
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card className="content-card">
        <Table
          rowSelection={{
            selectedRowKeys: selectedCustomerIds,
            onChange: setSelectedCustomerIds,
            getCheckboxProps: record => ({ disabled: record.status !== 'active' })
          }}
          columns={customerColumns}
          dataSource={customers}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>

      {/* 邮件预览模态框 */}
      <Modal
        title="批量邮件预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setPreviewVisible(false)}>
            取消
          </Button>,
          <Button
            key="send"
            type="primary"
            icon={<SendOutlined />}
            loading={sending}
            onClick={handleSend}
          >
            确认发送
          </Button>
        ]}
        width={1000}
      >
        <Spin spinning={loading}>
          {previewList.map((item, idx) => (
            <Card key={idx} style={{ marginBottom: 16 }}>
              <div><b>收件人：</b>{item.customer.name} ({item.customer.email})</div>
              <div style={{ marginTop: 8 }}><b>主题：</b>{item.subject}</div>
              <div style={{ marginTop: 8 }}><b>正文：</b></div>
              <div
                className="preview-content"
                style={{
                  border: '1px solid #d9d9d9',
                  padding: '12px',
                  borderRadius: '4px',
                  marginTop: '8px',
                  minHeight: '100px',
                  maxHeight: '600px',
                  overflow: 'auto',
                  backgroundColor: '#fafafa'
                }}
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
              {item.attachments && item.attachments.length > 0 && (
                <div style={{ marginTop: 8 }}><b>附件：</b>{item.attachments.map(f => f.filename).join(', ')}</div>
              )}
            </Card>
          ))}
        </Spin>
      </Modal>
    </div>
  );
};

export default SendEmail; 