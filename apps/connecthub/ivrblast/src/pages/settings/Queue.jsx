import React, { useState,useEffect } from 'react';
import axios from "axios";
import { Button, Input, Modal, Form, notification, Spin, Select, Table, Popconfirm, Flex ,Typography,Badge } from 'antd';
import { IoIosAdd } from "react-icons/io";
import { IoIosSearch } from "react-icons/io";

import "./style/Queue.css";



import { FaRegEdit } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";

const { Text } = Typography;
const { Option } = Select;
const Skilllist = () => {
  const [data, setData] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedRole, setSelectedRole] = useState("All");
  const [editingSkill, setEditingSkill] = useState(null);



  const [form] = Form.useForm();

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    console.log(values);
    setLoading(true);
  
    try {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhX2FnZW50SWQiOjIsImFfcmVnSWQiOjEsImFfY29tcGFueUNvZGUiOiJQVVRQTCIsImFfdXNlck5hbWUiOiJKZWdhbiIsImFfcGFzc3dvcmQiOiJKZWdhbkAxMjMiLCJhX3BoTG9naW4iOjExMTExLCJhX2NhbXBhaWduSWQiOnsiQWNjZXNzQ2FtcGFpZ25zIjpbIjkyIiwiNTA3MzUiLCI1MDczNyIsIjUwNzQxIiwiNTA3NDYiXX0sImFfbW9kZSI6MCwiYV9wbGF0Rm9ybVR5cGUiOjEsImFfcm9sZSI6NSwiYV9jYWxsZXJJZCI6IjExMTExIiwiYV9tYWlsSWQiOiJKZWdhbkAxMjMiLCJhX2xvZ2luU3RhdHVzIjowLCJhX2NvbnRleHQiOiJCcm93c2VyQ29udGV4dCIsImFfcGFzc3dvcmRIYXNoIjoiJDJiJDEyJGIzQ0FkWm8vS1hTZmVYVFRaWTlDLk9qRHUyaXRZSEdTNGxmeHp1MUxhVVFIN1l4c2NrUENTIiwiYV9tb2JpbGVOdW1iZXIiOjYzNzQwMzQ5OTUsImFfdW5pcXVlaWQiOm51bGwsImFfY2FsbHR5cGUiOm51bGwsImFfY29uZmRldGFpbHMiOm51bGwsImV4cCI6MTczODE4OTM5OSwiZW5jcnlwdGlvbiI6InB1bHNlZjZkYWZjYTVkMmRkZjA5NDlkZDI1MTUwOGFiZDY1NGYifQ.gfGqeoxFxBSSV_jqcKmb1MjQSTmBIFU7UT-lfHcHjFU");
  
      const raw = JSON.stringify({
        "queue_name": values.queue_name,
        "strategy": values.strategy,
        "membername": values.membername,
        "timeout": values.timeout
      });
  
      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
      };
  
      const response = await fetch("http://127.0.0.1:8000/queue/create", requestOptions);
      const result = await response.json(); // Parsing response as JSON
  
      console.log(result.responce);
  
      if (result.responce == 'sucess') {
        notification.success({
          message: 'Queue Added',
          description: 'The Queue has been successfully added.',
        });
        form.resetFields();
        tabledata();
        setIsModalVisible(false);
      } else {
        notification.error({
          message: 'Error',
          description: result.message || 'An unexpected error occurred.',
        });
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

  // const handleEdit = (skill) => {
  //   setEditingSkill(skill);
  //   form.setFieldsValue(skill);
  //   setIsModalVisible(true);
  // };

  const handleDelete = async (id) => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhX2FnZW50SWQiOjIsImFfcmVnSWQiOjEsImFfY29tcGFueUNvZGUiOiJQVVRQTCIsImFfdXNlck5hbWUiOiJKZWdhbiIsImFfcGFzc3dvcmQiOiJKZWdhbkAxMjMiLCJhX3BoTG9naW4iOjExMTExLCJhX2NhbXBhaWduSWQiOnsiQWNjZXNzQ2FtcGFpZ25zIjpbIjkyIiwiNTA3MzUiLCI1MDczNyIsIjUwNzQxIiwiNTA3NDYiXX0sImFfbW9kZSI6MCwiYV9wbGF0Rm9ybVR5cGUiOjEsImFfcm9sZSI6NSwiYV9jYWxsZXJJZCI6IjExMTExIiwiYV9tYWlsSWQiOiJKZWdhbkAxMjMiLCJhX2xvZ2luU3RhdHVzIjowLCJhX2NvbnRleHQiOiJCcm93c2VyQ29udGV4dCIsImFfcGFzc3dvcmRIYXNoIjoiJDJiJDEyJGIzQ0FkWm8vS1hTZmVYVFRaWTlDLk9qRHUyaXRZSEdTNGxmeHp1MUxhVVFIN1l4c2NrUENTIiwiYV9tb2JpbGVOdW1iZXIiOjYzNzQwMzQ5OTUsImFfdW5pcXVlaWQiOm51bGwsImFfY2FsbHR5cGUiOm51bGwsImFfY29uZmRldGFpbHMiOm51bGwsImV4cCI6MTczODE4OTM5OSwiZW5jcnlwdGlvbiI6InB1bHNlZjZkYWZjYTVkMmRkZjA5NDlkZDI1MTUwOGFiZDY1NGYifQ.gfGqeoxFxBSSV_jqcKmb1MjQSTmBIFU7UT-lfHcHjFU");

    const raw = JSON.stringify({
      "queue_id": id
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow"
    };

    const response = await fetch("http://127.0.0.1:8000/queue/delete", requestOptions);
    const result = await response.json(); // Parsing response as JSON

    console.log(result)
    if(result.responce == 'sucess'){
      notification.success({
        message: 'Skill Deleted',
        description: 'The Skill has been successfully deleted.',
      });
    }
    
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
      title: "Queue Name",
      dataIndex: "queue_name",
      key: "queue_name",
    },
    {
      title: "Strategy",
      dataIndex: "strategy",
      key: "strategy",
    },
    {
      title: 'Membername',
      dataIndex: 'membername',
      key: 'membername',
      render: (membername, record) => (
        <div>
          {/* Button to show the modal with the count of members */}
          <Button type="primary" onClick={() => showmembers(record.queue_id, membername)}>
            {membername.length} Members
          </Button>
    
          {/* Modal to display member details or additional content */}
          <Modal
            title="Members"
            open={isModalOpen}
            onCancel={handleCancel}
            footer={null} // Optional: Remove footer buttons if you don't need them
          >
            <div>  
              {Array.isArray(selectedMembers) && selectedMembers.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {selectedMembers.map((name, index) => (
                    <Button key={index} type="primary" style={{ marginRight: 10, marginBottom: 10 }}>
                      {name}
                    </Button>
                  ))}
                </div>
              ) : (
                <p>No members available</p> // Fallback if no members available
              )}
            </div>
          </Modal>
        </div>
      )
    },
    {
      title: "Timeout",
      dataIndex: "timeout",
      key: "timeout",
    },
    {
      title: "Actions",
      key: "actions",
      render: (membername) => (
        <div>
          <a  ><FaRegEdit className='Skill_list_edit_icon' /></a>
          <Popconfirm
            title="Are you sure to delete this skill?"
            onConfirm={() => handleDelete(membername.queue_id)}
            okText="Yes"
            cancelText="No"
          >
          <a><MdDeleteOutline className='Skill_list_deletes_icon' /></a>
          </Popconfirm>
        </div>
      ),
    },
  ];


  const tabledata = async () => {
    try {
      let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhX2FnZW50SWQiOjIsImFfcmVnSWQiOjEsImFfY29tcGFueUNvZGUiOiJQVVRQTCIsImFfdXNlck5hbWUiOiJKZWdhbiIsImFfcGFzc3dvcmQiOiJKZWdhbkAxMjMiLCJhX3BoTG9naW4iOjExMTExLCJhX2NhbXBhaWduSWQiOnsiQWNjZXNzQ2FtcGFpZ25zIjpbIjkyIiwiNTA3MzUiLCI1MDczNyIsIjUwNzQxIiwiNTA3NDYiXX0sImFfbW9kZSI6MCwiYV9wbGF0Rm9ybVR5cGUiOjEsImFfcm9sZSI6NSwiYV9jYWxsZXJJZCI6IjExMTExIiwiYV9tYWlsSWQiOiJKZWdhbkAxMjMiLCJhX2xvZ2luU3RhdHVzIjowLCJhX2NvbnRleHQiOiJCcm93c2VyQ29udGV4dCIsImFfcGFzc3dvcmRIYXNoIjoiJDJiJDEyJGIzQ0FkWm8vS1hTZmVYVFRaWTlDLk9qRHUyaXRZSEdTNGxmeHp1MUxhVVFIN1l4c2NrUENTIiwiYV9tb2JpbGVOdW1iZXIiOjYzNzQwMzQ5OTUsImFfdW5pcXVlaWQiOm51bGwsImFfY2FsbHR5cGUiOm51bGwsImFfY29uZmRldGFpbHMiOm51bGwsImV4cCI6MTczODE4NTMwMiwiZW5jcnlwdGlvbiI6InB1bHNlZjZkYWZjYTVkMmRkZjA5NDlkZDI1MTUwOGFiZDY1NGYifQ.KtIcvg-Uj6n5Fqns4w677wlf7ue7cmxiVZwMMJmyOlc';
  
      const response = await axios.get('http://127.0.0.1:8000/queue/fetch', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
  
      const responseData = response?.data?.data;
      console.log(response);
      setData(responseData);
    } catch (error) {
      console.error("Error fetching table data:", error);
    }
  };

  useEffect(() => {
    tabledata();
  }, []);

  const options = [];
  
  options.push({
    value:"1001",
    label: "1001",
  },
  {
    value:"1002",
    label: "1002",
  },
  {
    value:"1003",
    label: "1003",
  },
  {
    value:"1004",
    label: "1004",
  });
  
  const handleChange = (value) => {
    console.log(`selected ${value}`);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const showmembers = (queue_id, membername) => {
    setSelectedQueueId(queue_id);
    setSelectedMembers(membername); // Set the selected member names for this queue
    setIsModalOpen(true); // Open the modal
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };
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
            <IoIosAdd className='add_Skill_list_btn_icon' /> Add Queue
          </Button>
        </div>
      </div>

      {/* Modal for Adding/Editing Skill_list */}
      <Modal
        title={"Add Skill"}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} onFinish={handleSubmit} className="add_Skill_list_form" layout="vertical">

          <div className='create_skill_list_layout'>
            <Form.Item
              label="Queue NAME"
              name="queue_name"
              rules={[{ required: true, message: 'Please Enter the Queue Name!' }]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>

            <Form.Item
              label="Strategy"
              name="strategy"
              rules={[{ required: true, message: 'Please Enter the Strategy!' }]}
              
            >
              <Input style={{ width: 230 }} />
            </Form.Item>

          </div>
          <div className='create_skill_list_layout'>
            

            <Form.Item
              label="Member Name"
              name="membername"
              rules={[{ required: true, message: 'Please Select the Member Name!' }]}
            >
                <Select
                  mode="tags"
                  style={{
                    width: 230,
                  }}
                  placeholder="Tags Mode"
                  onChange={handleChange}
                  options={options}
                />
            </Form.Item>

            <Form.Item
              label="Timeout"
              name="timeout"
              rules={[
                { required: true, message: 'Please Enter the Timeout!' },
                { pattern: /^[0-9]+$/, message: 'Please input a valid Timeout (numbers only)!' },
              ]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>   
          </div>      

          <div className='create_skill_list_layout_last'>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ width: '100px' }}>
                {loading ? <Spin /> : 'Save Queue'}
              </Button>
            </Form.Item>
          </div>

        </Form>

      </Modal>

      <div style={{ padding: 20 }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="email"
        />
      </div>



    </div>
  );
}

export default Skilllist;
