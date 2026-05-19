import React, { useState } from 'react';
import { Button, Input, Modal, Form, notification, Spin, Select, Table, Popconfirm, Flex } from 'antd';
import { IoIosAdd } from "react-icons/io";
import { IoIosSearch } from "react-icons/io";
import { datas, totalcount } from './dummy'; // Assuming dummy data is imported

import "./style/Skilllist.css";



import { FaRegEdit } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";


const { Option } = Select;
const Skilllist = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedRole, setSelectedRole] = useState("All");
  const [editingSkill, setEditingSkill] = useState(null);

  const data = datas;

  const [form] = Form.useForm();

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await fakeApiCall(values);
      if (response.status === 'success') {
        notification.success({
          message: 'Skill Added',
          description: 'The Skill has been successfully added.',
        });
        form.resetFields();
        setIsModalVisible(false);
      }
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.message || 'An error occurred while adding the Skill list.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fakeApiCall = (values) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ status: 'success' });
      }, 2000);
    });
  };

  const filterData = (searchValue, departmentValue, selectedRole) => {
    let filtered = data;
    if (searchValue) {
      const lowerSearch = searchValue.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(lowerSearch) ||
          item.role.toLowerCase().includes(lowerSearch) ||
          item.email.toLowerCase().includes(lowerSearch) ||
          item.department.toLowerCase().includes(lowerSearch)
      );
    }
    if (departmentValue && departmentValue !== "All") {
      filtered = filtered.filter(
        (item) => item.department === departmentValue
      );
    }
    if (selectedRole && selectedRole !== "All") {
      filtered = filtered.filter(
        (item) => item.role === selectedRole
      );
    }
    return filtered;
  };

  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value);
  };

  const handleRoleChnage = (value) => {
    setSelectedRole(value);
  }

  const handleEdit = (skill) => {
    setEditingSkill(skill);
    form.setFieldsValue(skill);
    setIsModalVisible(true);
  };

  const handleDelete = (email) => {
    // You can add confirmation before deletion here
    const updatedData = data.filter(skill => skill.email !== email);
    notification.success({
      message: 'Skill Deleted',
      description: 'The Skill has been successfully deleted.',
    });
    // Ideally, you should update your data source state here
  };

  const filteredData = filterData(searchText, selectedDepartment, selectedRole);

  const columns = [
    {
      title: "S.NO.",
      key: "sno",
      render: (_, __, index) => index + 1,
    },
    {
      title: "REG ID",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "SKILL NAME",
      dataIndex: "role",
      key: "role",
    },
    {
      title: "DID NO",
      dataIndex: "extension",
      key: "extension",
    },
    {
      title: "PROJECT NAME",
      dataIndex: "number",
      key: "number",
    },
    {
      title: "PRIMARY SRC",
      dataIndex: "department",
      key: "department",
    },
    {
      title: "SECONDARY SRC",
      dataIndex: "language",
      key: "language",
    },
    {
      title: "OTHER",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <div>
          <a onClick={() => handleEdit(record)} ><FaRegEdit className='Skill_list_edit_icon' /></a>
          <Popconfirm
            title="Are you sure to delete this skill?"
            onConfirm={() => handleDelete(record.email)}
            okText="Yes"
            cancelText="No"
          >
            <a><MdDeleteOutline className='Skill_list_deletes_icon' /></a>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className='Skill_list_container'>
      <div className='Skill_list_header'>
        <p className='Skill_list_heading'>Skill list</p>
        <div className='Skill_list_header_input'>
          <Input
            className='Skill_list_search_input'
            placeholder="Search name/department"
            prefix={<IoIosSearch />}
            onChange={(curr) => setSearchText(curr.target.value)}
          />
          <Button type='primary' onClick={showModal}>
            <IoIosAdd className='add_Skill_list_btn_icon' /> Add Skill
          </Button>
        </div>
      </div>

      {/* Modal for Adding/Editing Skill_list */}
      <Modal
        title={editingSkill ? "Edit Skill" : "Add Skill"}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} onFinish={handleSubmit} className="add_Skill_list_form" layout="vertical">

          <div className='create_skill_list_layout'>
            <Form.Item
              label="REG ID"
              name="regid"
              rules={[
                { required: true, message: 'Please input the REG ID!' },
                { pattern: /^[0-9]+$/, message: 'Please input a valid REG ID (numbers only)!' },
              ]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>

            <Form.Item
              label="SKILL NAME"
              name="skillname"
              rules={[{ required: true, message: 'Please input the Skill name!' }]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>
          </div>

          <div className='create_skill_list_layout'>
            <Form.Item
              label="DID NO"
              name="didno"
              rules={[
                { required: true, message: 'Please input the DID NO!' },
                { pattern: /^[0-9]+$/, message: 'Please input a valid DID NO (numbers only)!' },
              ]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>

            <Form.Item
              label="PROJECT NAME"
              name="projectname"
              rules={[
                { required: true, message: 'Please input a valid Project name!' },
              ]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>
          </div>

          <div className='create_skill_list_layout'>
            <Form.Item
              label="PRIMARY SRC"
              name="primarysrc"
              rules={[{ required: true, message: 'Please input the primary src!' }]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>

            <Form.Item
              label="SECONDARY SRC"
              name="secondarysrc" // fixed key name to avoid spaces in the field name
              rules={[{ required: true, message: 'Please input the secondary src!' }]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>
          </div>

          <div className='create_skill_list_layout'>
            <Form.Item
              label="OTHER"
              name="Other"
              rules={[{ required: true, message: 'Please input the Other!' }]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>
          </div>

          <div className='create_skill_list_layout_last'>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ width: '100px' }}>
                {loading ? <Spin /> : 'Save Skill'}
              </Button>
            </Form.Item>
          </div>

        </Form>

      </Modal>

      <div style={{ padding: 20 }}>
        <div className='Skill_list_filter_section'>
          <div className='Skill_list_filters'>
            <Form.Item label="Role" name="Role">
              <Select
                placeholder="Select Role"
                style={{ width: 200 }}
                onChange={handleRoleChnage}
                defaultValue="All"
              >
                <Option value="All">All</Option>
                <Option value="Admin">Admin</Option>
                <Option value="Manager">Manager</Option>
                <Option value="Designer">Designer</Option>
                <Option value="Support">Support</Option>
                <Option value="Developer">Developer</Option>
                <Option value="HR Specialist">HR Specialist</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Department" name="Department">
              <Select
                placeholder="Select Department"
                style={{ width: 200 }}
                onChange={handleDepartmentChange}
                defaultValue="All"
              >
                <Option value="All">All</Option>
                <Option value="Software">Software</Option>
                <Option value="HR">HR</Option>
                <Option value="Development">Development</Option>
                <Option value="Design">Design</Option>
                <Option value="Support">Support</Option>
                <Option value="Administration">Administration</Option>
                <Option value="Marketing">Marketing</Option>
                <Option value="Sales">Sales</Option>
              </Select>
            </Form.Item>
          </div>
          <p>Total data: {totalcount}</p>

        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="email"
        />
      </div>
    </div>
  );
}

export default Skilllist;
