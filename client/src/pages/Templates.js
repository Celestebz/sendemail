import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Button, Table, Modal, Form, Input, message, Space, Upload, Popconfirm
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, EyeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form] = Form.useForm();
  const [previewData, setPreviewData] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [editorContent, setEditorContent] = useState('');
  const quillRef = useRef(null);

  // 富文本编辑器图片上传处理
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        const formData = new FormData();
        formData.append('image', file);

        try {
          const response = await axios.post('/api/templates/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          const imageUrl = response.data.data.url;

          // 安全地获取编辑器实例
          if (quillRef.current) {
            const quill = quillRef.current.getEditor();
            const range = quill.getSelection(true);
            if (range) {
              quill.insertEmbed(range.index, 'image', imageUrl);
              quill.setSelection(range.index + 1);
            }
          }
        } catch (error) {
          message.error('图片上传失败');
        }
      }
    };
  };

  // 富文本编辑器配置 - 使用 useMemo 避免重复创建
  const modules = React.useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image'
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/templates');
      setTemplates(response.data.data || []);
    } catch (error) {
      message.error('获取模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    setAttachments([]);
    setEditorContent('');
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingTemplate(record);
    form.setFieldsValue({
      name: record.name,
      subject: record.subject
    });
    setEditorContent(record.content || '');
    setAttachments(
      record.attachments
        ? JSON.parse(record.attachments).map((file, idx) => ({
            uid: idx + '',
            name: file.filename,
            status: 'done',
            url: file.path,
            originFileObj: undefined
          }))
        : []
    );
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/templates/${id}`);
      message.success('删除成功');
      fetchTemplates();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 验证富文本内容
      if (!editorContent || editorContent.trim() === '<p><br></p>' || editorContent.trim() === '') {
        message.error('请输入邮件正文');
        return;
      }

      // 准备FormData
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('subject', values.subject);
      formData.append('content', editorContent);
      
   // 只保留当前 attachments 里的现有文件
const existingFiles = attachments.filter(file => !file.originFileObj && file.url);
existingFiles.forEach(file => {
  formData.append('existingAttachments', JSON.stringify({
    filename: file.name,
    path: file.url
  }));
});
attachments.forEach(file => {
  if (file.originFileObj) {
    // 新上传的文件
    formData.append('attachments', file.originFileObj);
  }
});
      
      if (editingTemplate) {
        await axios.put(`/api/templates/${editingTemplate.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        message.success('更新成功');
      } else {
        await axios.post('/api/templates', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        message.success('添加成功');
      }
      setModalVisible(false);
      fetchTemplates();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handlePreview = async (record) => {
    try {
      // 预览时用假数据替换变量
      const customerData = {
        name: '张三',
        company: '测试公司',
        email: 'test@example.com',
        phone: '13800000000'
      };
      const response = await axios.post(`/api/templates/${record.id}/preview`, { customerData });
      setPreviewData(response.data.data);
      setPreviewVisible(true);
    } catch (error) {
      message.error('预览失败');
    }
  };

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '主题',
      dataIndex: 'subject',
      key: 'subject',
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
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EyeOutlined />} onClick={() => handlePreview(record)}>
            预览
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个模板吗？"
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">邮件模板</h1>
      </div>

      <Card className="content-card" style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新建模板
        </Button>
      </Card>

      <Card className="content-card">
        <Table
          columns={columns}
          dataSource={templates}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>

      {/* 添加/编辑模板模态框 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '新建模板'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={900}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item
            label="主题"
            name="subject"
            rules={[{ required: true, message: '请输入邮件主题' }]}
          >
            <Input placeholder="请输入邮件主题" />
          </Form.Item>
          <Form.Item
            label="正文内容"
            extra="可用变量：{{客户姓名}}、{{公司名称}}、{{邮箱}}、{{电话}}"
          >
            <div style={{ marginBottom: '80px' }}>
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={editorContent}
                onChange={setEditorContent}
                modules={modules}
                formats={formats}
                placeholder="请输入邮件正文，可用变量如：{{客户姓名}}，点击工具栏图片按钮可插入图片"
                style={{ height: '450px' }}
              />
            </div>
          </Form.Item>
          <Form.Item label="附件" name="attachments">
            <Upload 
              fileList={attachments}
              onChange={({ fileList }) => setAttachments(fileList)}
              beforeUpload={() => false} 
              multiple
            >
              <Button icon={<UploadOutlined />}>上传附件</Button>
            </Upload>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingTemplate ? '更新' : '添加'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 模板预览模态框 */}
      <Modal
        title="模板预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={900}
      >
        <Card>
          <h3>主题：</h3>
          <div>{previewData.subject}</div>
          <h3 style={{ marginTop: 16 }}>正文：</h3>
          <div
            style={{
              border: '1px solid #d9d9d9',
              padding: '12px',
              borderRadius: '4px',
              minHeight: '100px',
              maxHeight: '600px',
              overflow: 'auto',
              backgroundColor: '#fafafa'
            }}
            className="preview-content"
            dangerouslySetInnerHTML={{ __html: previewData.content }}
          />
          {previewData.attachments && previewData.attachments.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>附件：</h3>
              <ul>
                {previewData.attachments.map((file, idx) => (
                  <li key={idx}>{file.filename}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </Modal>
    </div>
  );
};

export default Templates; 