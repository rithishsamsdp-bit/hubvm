
import React, { useState } from 'react';
import { Button, Input, Modal, Form, notification, Spin, Select, Table, Popconfirm, Flex } from 'antd';
import { IoIosAdd } from "react-icons/io";
import { IoIosSearch } from "react-icons/io";
import { datas, totalcount } from './blocklist_dummy.js'; 

import "./style/Blocklist.css";


import { FaRegEdit } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";


const { Option } = Select;
const Blocklist = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedRole, setSelectedRole] = useState("All");
  const [editingBlock, setEditingBlock] = useState(null);

  const data = datas;

  const [form] = Form.useForm();
  const { TextArea } = Input;
  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await fakeApiCall(values);
      if (response.status === 'success') {
        notification.success({
          message: 'Number Added',
          description: 'The number has been successfully added to block list.',
        });
        form.resetFields();
        setIsModalVisible(false);
      }
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.message || 'An error occurred while adding the block list',
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

  const handleEdit = (block) => {
    setEditingBlock(block);
    form.setFieldsValue(block);
    setIsModalVisible(true);
  };

  const handleCancel = () =>{
    setIsModalVisible(false);
    setEditingBlock(null);
  };

  const handleDelete = (email) => {
    // You can add confirmation before deletion here
    const updatedData = data.filter(skill => skill.email !== email);
    notification.success({
      message: 'Number Deleted',
      description: 'The number has been successfully deleted.',
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
      title: "NUMBER",
      dataIndex: "number",
      key: "number",
    },
    {
      title: "DESCRIPTION",
      dataIndex: "description",
      key: "description",
    },

    {
      title: "ACTIONS",
      key: "actions",
      render: (_, record) => (
        <div>
          <a onClick={() => handleEdit(record)} ><FaRegEdit className='Block_list_edit_icon' /></a>
          <Popconfirm
            title="Are you sure to unblock this number?"
            onConfirm={() => handleDelete(record.email)}
            okText="Yes"
            cancelText="No"
          >
            <a><MdDeleteOutline className='Block_list_deletes_icon' /></a>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className='Block_list_container'>
      <div className='Block_list_header'>
        <p className='Block_list_heading'>Block list</p>
        <div className='Block_list_header_input'>
          <Input
            className='Block_list_search_input'
            placeholder="Search number"
            prefix={<IoIosSearch />}
            onChange={(curr) => setSearchText(curr.target.value)}
          />
          <Button type='primary' onClick={showModal}>
            <IoIosAdd className='add_Block_list_btn_icon' /> Add
          </Button>
        </div>
      </div>

      {/* Modal for Adding/Editing Block_list */}
      <Modal
        title={editingBlock ? "Edit block list" : "Add Block List"}
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        destroyOnClose
      >
        <Form form={form} onFinish={handleSubmit} className="add_Block_list_form" layout="vertical">

      
            <Form.Item
              label="NUMBER"
              name="number"
              rules={[
                { required: true, message: 'Please input the Number!' },
                { pattern: /^[0-9]+$/, message: 'Please input a valid number (numbers only)!' },
              ]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>

            <Form.Item
              label="DESCRIPTION"
              name="description"
              rules={[{ required: true, message: 'Please input the description!' }]}
            >
              <TextArea  />
            </Form.Item>
        
            <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block >
                            {loading ? <Spin /> : 'Save'}
                        </Button>
                    </Form.Item>


        </Form>

      </Modal>

      <div style={{ padding: 20 }}>
        <div className='Block_list_filter_section'>
          <div className='Block_list_filters'>
           
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

export default Blocklist;
