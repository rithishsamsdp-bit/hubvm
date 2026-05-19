import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, Form, notification, Spin, Select, Table, Popconfirm } from 'antd';
import { IoIosAdd } from "react-icons/io";
import { IoIosSearch } from "react-icons/io";
import useraxios from '../../functions/useraxios';

import "./style/Users.css";

import { FaCircleUser } from "react-icons/fa6";
import { MdArrowDropDown, MdArrowDropUp, MdOutlineUploadFile } from "react-icons/md";
import { FaUser } from 'react-icons/fa';
import { IoCall } from "react-icons/io5";
import { FaRegEdit } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";

const Users = () => {
  const [usermodel, setusermodel] = useState(false);
  const [uploadusermodel, setuploadusermodel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [editingUser, setEditingUser] = useState(false);
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [data, setData] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createmodelloading, setcreatemodelloading] = useState(true);
  const [advancedSettingsVisible, setAdvancedSettingsVisible] = useState(false);

  const token = '';



  useEffect(() => {
    if (token) {
      const fetchUsers = async () => {
        setTableLoading(true);
        setLoading(true);
        setTotal('');
        setData('');
        setError('');
        try {
          const response = await useraxios.post('/user/fetch', {
            limit,
            offset,
            searchString: searchText
          },
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
          console.log(response.data)
          if (response.data.status == "success") {
            setTotal(response.data.data.totalRecords);
            setData(response.data.data.agentRecords);
            setError(null);
          } else {
            setError('Failed to fetch users. No data found.');
          }

        } catch (error) {
          console.log(error);
          notification.error({
            message: 'Error',
            description: 'Failed to fetch users.',
          });
        } finally {
          setLoading(false);
          setTableLoading(false);
        }
      }
      fetchUsers();
    } else {
      console.log("In users page tabel data api token not found")
    }


  }, [limit, offset, token, searchText]);

  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await fakeApiCall(values);
      if (response.status === 'success') {
        notification.success({
          message: 'User Added',
          description: 'The user has been successfully added.',
        });
        form.resetFields();
        setusermodel(false);
      }
    } catch (error) {
      // notification.error({
      //   message: 'Error',
      //   description: error.message || 'An error occurred while adding the user.',
      // });
      // Check if the error has a message and display it
      const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred.';
      setError(errorMessage);
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

  const handleEdit = (user) => {
    setEditingUser(true);
    form.setFieldsValue(user);
    setusermodel(true);
  };

  const handleDelete = (email) => {
    // You can add confirmation before deletion here
    const updatedData = data.filter(user => user.email !== email);
    notification.success({
      message: 'User Deleted',
      description: 'The user has been successfully deleted.',
    });
    // Ideally, you should update your data source state here
  };


  const onSelectChange = (selectedKeys) => {
    setSelectedRowKeys(selectedKeys);
  };

  // Handle group delete (delete selected rows)
  const handleGroupDelete = () => {
    // Assuming you have a function to delete items based on their IDs
    const idsToDelete = selectedRowKeys; // IDs of the selected rows
    if (idsToDelete.length > 0) {
      // Perform the delete action here (e.g., call an API to delete selected rows)
      console.log('Deleting rows with IDs: ', idsToDelete);

      // After deleting, update the data to reflect the changes (filter out deleted rows)
      // setData(prevData => prevData.filter(item => !idsToDelete.includes(item.a_mailId)));
      // Reset selected row keys after deletion
      setSelectedRowKeys([]);
    }
  };

  const columns = [
    {
      title: "S.NO.",
      key: "sno",
      render: (_, __, index) => offset + index + 1,
    },
    {
      title: "Company code",
      dataIndex: "a_companyCode",
      key: "a_companyCode",
    },
    {
      title: "Name",
      dataIndex: "a_userName",
      key: "a_userName",
    },
    {
      title: "Password",
      dataIndex: "a_password",
      key: "a_password",
    },
    {
      title: "ph Login",
      dataIndex: "a_phLogin",
      key: "a_phLogin",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <div>
          <a onClick={() => handleEdit(record)} ><FaRegEdit className='Users_edit_icon' /></a>
          <Popconfirm
            title="Are you sure to delete this user?"
            onConfirm={() => handleDelete(record.a_mailId)}
            okText="Yes"
            cancelText="No"
          >
            <a><MdDeleteOutline className='users_deletes_icon' /></a>
          </Popconfirm>
        </div>
      ),
    },
  ];


  //model functions

  const useropenmodel = () => {
    setusermodel(true);
    setcreatemodelloading(true);
  }
  const userclosemodel = () => {
    setusermodel(false);
    form.resetFields();
    setEditingUser(false);
    setAdvancedSettingsVisible(false);
  }

  const uploadopenmodel = () => {
    setuploadusermodel(true);
  }

  const uploadclosemodel = () => {
    setuploadusermodel(false);
  }

  setTimeout(() => {
    setcreatemodelloading(false);
  }, 2000);

  return (
    <div className='users_container'>
      {error && <Alert message="Error" description={error} type="error" showIcon closable />}
      <div className='users_header'>
        <p className='users_heading'>Users</p>
        <div className='Users_header_input'>
          <Input
            className='users_search_input'
            placeholder="Search name/department"
            prefix={<IoIosSearch />}
            onChange={(curr) => setSearchText(curr.target.value)}
          />
          <Button type='primary' onClick={useropenmodel}>
            <IoIosAdd className='add_users_btn_icon' /> Add Users
          </Button>
          <Button type='primary' onClick={uploadopenmodel}>
            <MdOutlineUploadFile className='add_users_btn_icon' /> Upload
          </Button>
        </div>
      </div>

      {/* Modal for Adding/Editing User */}
      <Modal
        title={editingUser ? "Edit User" : "Add User"}
        visible={usermodel}
        onCancel={userclosemodel}
        footer={null}
        destroyOnClose
        loading={createmodelloading}
        width={800}
        maskClosable={false}
      >
        <Form form={form} onFinish={handleSubmit} className="add_users_form" layout="vertical">
          <div className="create_users_list_layout">
            <Form.Item
              label="User name"
              name="a_userName"
              rules={[{ required: true, message: 'Please input the name!' }]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>

            <Form.Item
              label="Password"
              name="Password"
              rules={[{ required: true, message: 'Please input the Password!' }]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>

            <Form.Item
              label="Mobile number"
              name="Mobile"
              rules={[
                { required: true, message: 'Please input the Mobile number!' },
                { pattern: /^[0-9]+$/, message: 'Mobile number must be a number!' },
              ]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>
          </div>

          <div className="create_users_list_layout">
            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, type: 'email', message: 'Please input a valid email!' }]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>

            <Form.Item
              label="Role"
              name="role"
              rules={[{ required: true, message: 'Please input the role!' }]}
            >
              <Select style={{ width: 230 }}>
                <Select.Option value="Admin">Admin</Select.Option>
                <Select.Option value="TL">Team Leader</Select.Option>
                <Select.Option value="Agent">Agent</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Extension"
              name="Extension"
              rules={[
                { required: true, message: 'Please input the Extension!' },
                { pattern: /^[0-9]+$/, message: 'Extension must be a number!' },
              ]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>
          </div>

          <div className="create_users_list_layout">
            <Form.Item
              label="Caller id"
              name="Caller_id"
              rules={[
                { required: true, message: 'Please input the Caller id!' },
                { pattern: /^[0-9]+$/, message: 'Caller id must be a number!' },
              ]}
            >
              <Input style={{ width: 230 }} />
            </Form.Item>

            <Form.Item
              label="Mode"
              name="mode"
              rules={[{ required: true, message: 'Please input the mode!' }]}
            >
              <Select style={{ width: 230 }}>
                <Select.Option value="Browser">Browser</Select.Option>
                <Select.Option value="Softphone">Softphone</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Platform"
              name="Platform"
              rules={[{ required: true, message: 'Please input the Platform!' }]}
            >
              <Select style={{ width: 230 }}>
                <Select.Option value="RCM">RCM</Select.Option>
                <Select.Option value="Call_Center">Call Center</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <div className="create_users_list_layout">
            <Form.Item
              label="Campaign name"
              name="Campaign_name"
              rules={[{ required: true, message: 'Please Select the Campaign name!' }]}
            >
              <Select style={{ width: 230 }}>
                <Select.Option value="50742">50742</Select.Option>
                <Select.Option value="50743">50743</Select.Option>
              </Select>
            </Form.Item>

            {editingUser ? (
              <Button type="link" onClick={() => setAdvancedSettingsVisible(!advancedSettingsVisible)} style={{ fontSize: "14px" }}>
                ADVANCED SETTINGS{advancedSettingsVisible ? <MdArrowDropUp style={{ fontSize: "25px" }} /> : <MdArrowDropDown style={{ fontSize: "25px" }} />}
              </Button>
            ) : ""}

          </div>

          {advancedSettingsVisible && (
            <div className="create_users_list_layout">
              <Form.Item
                label="Max contacts"
                name="max_contacts"

              >
                <Input style={{ width: 230 }} />
              </Form.Item>

              <Form.Item
                label="Codec type"
                name="Codec_type"

              >
                <Select style={{ width: 230 }} mode="multiple">
                  <Select.Option value="50742">50742</Select.Option>
                  <Select.Option value="50743">50743</Select.Option>
                  <Select.Option value="ulaw">ulaw</Select.Option>
                  <Select.Option value="alaw" selected="selected">alaw</Select.Option>
                  <Select.Option value="g729">g729</Select.Option>
                  <Select.Option value="codec2">codec2</Select.Option>
                  <Select.Option value="gsm">gsm</Select.Option>
                  <Select.Option value="g726">g726</Select.Option>
                  <Select.Option value="g726aal2">g726aal2</Select.Option>
                  <Select.Option value="adpcm">adpcm</Select.Option>
                  <Select.Option value="slin8">slin8</Select.Option>
                  <Select.Option value="slin12">slin12</Select.Option>
                  <Select.Option value="slin16">slin16</Select.Option>
                  <Select.Option value="slin24">slin24</Select.Option>
                  <Select.Option value="slin32">slin32</Select.Option>
                  <Select.Option value="slin44">slin44</Select.Option>
                  <Select.Option value="slin48">slin48</Select.Option>
                  <Select.Option value="slin96">slin96</Select.Option>
                  <Select.Option value="slin192">slin192</Select.Option>
                  <Select.Option value="lpc10">lpc10</Select.Option>
                  <Select.Option value="speex8">speex8</Select.Option>
                  <Select.Option value="speex16">speex16</Select.Option>
                  <Select.Option value="speex32">speex32</Select.Option>
                  <Select.Option value="ilbc">ilbc</Select.Option>
                  <Select.Option value="g722">g722</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Context"
                name="Context"



              >
                <Input style={{ width: 230 }} />
              </Form.Item>
            </div>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block >
              {loading ? '' : (editingUser ? "Save" : "Add user")}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Model for Upload */}

      <Modal
        title={"Users Upload"}
        visible={uploadusermodel}
        onCancel={uploadclosemodel}
        footer={null}
        destroyOnClose
        loading={createmodelloading}
        width={800}
        maskClosable={false}
      >

      </Modal>


      <div style={{ padding: 20 }}>
        <div className='users_filter_section'>
          <div className='users_filters'>
            <Button
              type="danger"
              onClick={handleGroupDelete}
            // disabled={selectedRowKeys.length === 0}
            >
              Delete Selected
            </Button>
          </div>
          <p>Total data:{total}</p>

        </div>

        <Table
          size={"small"}
          bordered={"enable"}
          columns={columns}
          rowSelection={{
            selectedRowKeys,
            onChange: onSelectChange,
          }}
          dataSource={data}
          loading={tableLoading}
          rowKey="a_agentId"
          pagination={{
            current: (offset / limit) + 1,
            pageSize: limit,
            total,
            onChange: (page) => {
              setOffset((page - 1) * limit);
            },
            showSizeChanger: true,
            onShowSizeChange: (current, size) => {
              setLimit(size);
              setOffset(0);
            },
            position: ["bottomLeft"],
          }}
          expandable={{
            expandedRowRender: (record) => (
              // <p style={{ margin: 0 }}>
              //   <strong>Additional Info:</strong> Email - {record.email}
              // </p>
              <div className="users_tabel_view_container">
                <div className='users_tabel_first_container'>
                  <FaCircleUser className='users_tabel_user_icon' />
                </div>
                <div className='users_tabel_second_container'>

                  <div>
                    <p className='users_username'>{record.a_userName}</p>
                    <p className='users_email'>{record.a_mailId}</p>
                  </div>
                  <div className='users_details_container'>
                    <div className='users_details_container_1'>
                      <div className='users_details'>
                        <p><FaUser /> ROLE</p>
                        <p>{record.a_role}</p>
                      </div>
                      <div className='users_details'>
                        <p>DEPARTMENT</p>
                        <p>{record.department}</p>
                      </div>
                      <div className='users_details'>
                        <p>ONLINE STATUS</p>
                        <p style={{ color: 'green' }}>Avaliable</p>
                      </div>
                    </div>
                    <div className='users_details_container_2'>
                      <div className='users_details'>
                        <p><IoCall /> EXTENSION</p>
                        <p>{record.extension}</p>
                      </div>
                      <div className='users_details'>
                        <p>Context</p>
                        <p>{record.a_context}</p>
                      </div>
                      <div className='users_details'>
                        <p>TELEPHONY ACCESS</p>
                        <p>Disabled</p>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
}

export default Users;
