import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  MailOutlined,
  SettingOutlined,
  BarChartOutlined
} from '@ant-design/icons';

import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Templates from './pages/Templates';
import SendEmail from './pages/SendEmail';
import Records from './pages/Records';
import Settings from './pages/Settings';

const { Header, Sider, Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/customers',
      icon: <UserOutlined />,
      label: '客户管理',
    },
    {
      key: '/templates',
      icon: <FileTextOutlined />,
      label: '邮件模板',
    },
    {
      key: '/send',
      icon: <MailOutlined />,
      label: '发送邮件',
    },
    {
      key: '/records',
      icon: <BarChartOutlined />,
      label: '发送记录',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div className="logo">
          {collapsed ? '📧' : '批量发邮件'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: '#fff' }}>
          <div style={{ padding: '0 24px', fontSize: '18px', fontWeight: 'bold' }}>
            批量发推广信工具
          </div>
        </Header>
        <Content style={{ margin: '0 16px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/send" element={<SendEmail />} />
            <Route path="/records" element={<Records />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App; 