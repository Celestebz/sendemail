import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Switch, message, Space, Divider } from 'antd';
import { SaveOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      if (response.data.success && response.data.data) {
        form.setFieldsValue(response.data.data);
      }
    } catch (error) {
      console.error('获取设置失败:', error);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/settings', values);
      if (response.data.success) {
        message.success('邮箱设置保存成功');
      } else {
        message.error(response.data.error || '保存失败');
      }
    } catch (error) {
      message.error('保存失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const testSMTP = async () => {
    const values = await form.validateFields();
    setTesting(true);
    try {
      const response = await axios.post('/api/settings/test-smtp', values);
      if (response.data.success) {
        message.success('SMTP连接测试成功');
      } else {
        message.error(response.data.error || '测试失败');
      }
    } catch (error) {
      message.error('测试失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">系统设置</h1>
      </div>

      <Card title="邮箱配置" className="content-card">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            secure: true,
            smtp_port: 465,
            pop_port: 995
          }}
        >
          <Divider orientation="left">SMTP设置（发送邮件）</Divider>
          
          <Form.Item
            label="SMTP服务器"
            name="smtp_host"
            rules={[{ required: true, message: '请输入SMTP服务器地址' }]}
          >
            <Input placeholder="例如: smtp.example.com" />
          </Form.Item>

          <Form.Item
            label="SMTP端口"
            name="smtp_port"
            rules={[{ required: true, message: '请输入SMTP端口' }]}
          >
            <Input type="number" placeholder="例如: 465" />
          </Form.Item>

          <Form.Item
            label="邮箱地址"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="例如: user@example.com" />
          </Form.Item>

          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="邮箱用户名或完整邮箱地址" />
          </Form.Item>

          <Form.Item
            label="密码/授权码"
            name="password"
            rules={[{ required: true, message: '请输入密码或授权码' }]}
          >
            <Input.Password placeholder="邮箱密码或应用授权码" />
          </Form.Item>

          <Form.Item
            label="安全连接"
            name="secure"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Divider orientation="left">POP设置（接收邮件）</Divider>
          
          <Form.Item
            label="POP服务器"
            name="pop_host"
          >
            <Input placeholder="例如: pop.example.com" />
          </Form.Item>

          <Form.Item
            label="POP端口"
            name="pop_port"
          >
            <Input type="number" placeholder="例如: 995" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<SaveOutlined />}
              >
                保存设置
              </Button>
              <Button 
                onClick={testSMTP} 
                loading={testing}
                icon={<CheckCircleOutlined />}
              >
                测试SMTP连接
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Settings; 