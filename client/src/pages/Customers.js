import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Space, 
  Upload, 
  Popconfirm,
  Tag,
  InputNumber,
  Row,
  Col,
  Statistic,
  Layout,
  Menu
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UploadOutlined, 
  DownloadOutlined,
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;
const { Sider, Content } = Layout;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [groupModal, setGroupModal] = useState({ open: false, name: '' });

  useEffect(() => {
    fetchCustomers();
    fetchGroups();
  }, [searchText, selectedGroup, selectedStatus]);

  const fetchCustomers = async (group_id = selectedGroup) => {
    setLoading(true);
    try {
      const params = {};
      if (searchText) params.search = searchText;
      if (group_id) params.group_id = group_id;
      if (selectedStatus) params.status = selectedStatus;
      
      const response = await axios.get('/api/customers', { params });
      setCustomers(response.data.data || []);
    } catch (error) {
      message.error('获取联系人列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/api/groups');
      setGroups([{ id: null, name: '未分组' }, ...(response.data.data || [])]);
    } catch (error) {
      message.error('获取分组列表失败');
    }
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingCustomer(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/customers/${id}`);
      message.success('删除成功');
      fetchCustomers();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingCustomer) {
        await axios.put(`/api/customers/${editingCustomer.id}`, values);
        message.success('更新成功');
      } else {
        await axios.post('/api/customers', values);
        message.success('添加成功');
      }
      setModalVisible(false);
      fetchCustomers();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('/api/customers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        message.success(response.data.message);
        fetchCustomers();
      } else {
        message.error(response.data.error);
      }
    } catch (error) {
      message.error('导入失败');
    }
    
    return false; // 阻止自动上传
  };

  const handleExport = async () => {
    try {
      const response = await axios.get('/api/customers/export/csv', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'customers.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleAddGroup = async () => {
    if (!groupModal.name.trim()) return message.warning('分组名称不能为空');
    await axios.post('/api/groups', { name: groupModal.name });
    setGroupModal({ open: false, name: '' });
    fetchGroups();
    message.success('分组添加成功');
  };

  const handleDeleteGroup = async (id) => {
    await axios.delete(`/api/groups/${id}`);
    fetchGroups();
    if (selectedGroup === id) setSelectedGroup(null);
    fetchCustomers(null);
    message.success('分组已删除，组内联系人已移到未分组');
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
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
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
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
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => new Date(time).toLocaleDateString(),
    },
          {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个联系人吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    groups: groups.length
  };

  return (
    <Layout style={{ minHeight: 600, background: '#fff' }}>
      <Sider width={200} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ marginBottom: 16, fontWeight: 'bold' }}>联系人分组</div>
          <Menu
            mode="inline"
            selectedKeys={[String(selectedGroup)]}
            onClick={({ key }) => setSelectedGroup(key === 'null' ? null : Number(key))}
            style={{ height: '100%', border: 'none' }}
          >
            {groups.map(g => (
              <Menu.Item key={String(g.id)}>
                <span>{g.name}</span>
                {g.id && (
                  <Popconfirm
                    title="确定删除该分组？"
                    onConfirm={() => handleDeleteGroup(g.id)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Button
                      type="link"
                      size="small"
                      style={{ float: 'right', color: '#ff4d4f' }}
                      onClick={e => e.stopPropagation()}
                    >删除</Button>
                  </Popconfirm>
                )}
              </Menu.Item>
            ))}
          </Menu>
          <Button
            type="primary"
            block
            style={{ margin: '16px 0' }}
            onClick={() => setGroupModal({ open: true, name: '' })}
          >添加分组</Button>
        </div>
        <Modal
          title="添加分组"
          open={groupModal.open}
          onOk={handleAddGroup}
          onCancel={() => setGroupModal({ open: false, name: '' })}
        >
          <Input
            placeholder="分组名称"
            value={groupModal.name}
            onChange={e => setGroupModal({ ...groupModal, name: e.target.value })}
          />
        </Modal>
      </Sider>
      <Layout style={{ background: '#fff' }}>
        <Content style={{ padding: '24px 24px 0' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontWeight: 500 }}>联系人管理</h2>
          </div>

          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Card className="stats-card" bordered={false}>
                <Statistic
                  title="联系人总数"
                  value={stats.total}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="stats-card" bordered={false}>
                <Statistic
                  title="活跃联系人"
                  value={stats.active}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="stats-card" bordered={false}>
                <Statistic
                  title="联系人分组"
                  value={stats.groups}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 操作栏 */}
          <div style={{ marginBottom: 16, background: '#fafafa', padding: 16, borderRadius: 8 }}>
            <Row gutter={16} align="middle">
              <Col span={6}>
                <Input.Search
                  placeholder="搜索联系人姓名、邮箱或公司"
                  onSearch={setSearchText}
                  allowClear
                />
              </Col>
              <Col span={4}>
                <Select
                  placeholder="选择分组"
                  allowClear
                  style={{ width: '100%' }}
                  onChange={setSelectedGroup}
                >
                  {groups.map(group => (
                    <Option key={group.id} value={group.id}>{group.name}</Option>
                  ))}
                </Select>
              </Col>
              <Col span={4}>
                <Select
                  placeholder="选择状态"
                  allowClear
                  style={{ width: '100%' }}
                  onChange={setSelectedStatus}
                >
                  <Option value="active">活跃</Option>
                  <Option value="inactive">非活跃</Option>
                </Select>
              </Col>
              <Col span={10}>
                <Space>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                  >
                    添加联系人
                  </Button>
                  <Upload
                    accept=".xlsx,.xls,.csv"
                    beforeUpload={handleImport}
                    showUploadList={false}
                  >
                    <Button icon={<UploadOutlined />}>
                      导入联系人
                    </Button>
                  </Upload>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleExport}
                  >
                    导出联系人
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>

          {/* 联系人列表 */}
          <Table
            columns={columns}
            dataSource={customers}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            }}
          />

          {/* 添加/编辑联系人模态框 */}
          <Modal
            title={editingCustomer ? '编辑联系人' : '添加联系人'}
            open={modalVisible}
            onCancel={() => setModalVisible(false)}
            footer={null}
            width={600}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item
                    label="名字"
                    name="first_name"
                    rules={[{ required: true, message: '请输入名字' }]}
                  >
                    <Input placeholder="如：John" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    label="姓氏"
                    name="last_name"
                    rules={[{ required: true, message: '请输入姓氏' }]}
                  >
                    <Input placeholder="如：Smith" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="邮箱"
                    name="email"
                    rules={[
                      { required: true, message: '请输入邮箱地址' },
                      { type: 'email', message: '请输入有效的邮箱地址' }
                    ]}
                  >
                    <Input placeholder="请输入邮箱地址" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="公司"
                    name="company"
                  >
                    <Input placeholder="请输入公司名称" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="电话"
                    name="phone"
                  >
                    <Input placeholder="请输入电话号码" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="分组"
                name="group_id"
              >
                <Select placeholder="请选择联系人分组" allowClear>
                  {groups.map(group => (
                    <Option key={group.id} value={group.id}>{group.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="备注"
                name="notes"
              >
                <TextArea rows={3} placeholder="请输入备注信息" />
              </Form.Item>

              {editingCustomer && (
                <Form.Item
                  label="状态"
                  name="status"
                >
                  <Select>
                    <Option value="active">活跃</Option>
                    <Option value="inactive">非活跃</Option>
                  </Select>
                </Form.Item>
              )}

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    {editingCustomer ? '更新' : '添加'}
                  </Button>
                  <Button onClick={() => setModalVisible(false)}>
                    取消
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Customers; 