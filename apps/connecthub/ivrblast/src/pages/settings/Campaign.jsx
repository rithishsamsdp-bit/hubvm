import React, { useState } from 'react';
import { Button, Input, Modal, Form, notification, Spin, Select, Table, Popconfirm, Flex } from 'antd';
import { IoIosAdd } from "react-icons/io";
import { IoIosSearch } from "react-icons/io";
import "./style/Campaign.css";



import { FaRegEdit } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";


const { Option } = Select;

const Campaign = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("All");
    const [selectedRole, setSelectedRole] = useState("All");
    const [editingCampaign, setEditingCampaign] = useState(null);

    const data = [];

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
                    message: 'carrier Added',
                    description: 'The Carrier has been successfully added.',
                });
                form.resetFields();
                setIsModalVisible(false);
            }
        } catch (error) {
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while adding the Carrier list.',
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

    const handleEdit = (Ivrblastcarriercampaign) => {
        setEditingCampaign(Ivrblastcarriercampaign);
        form.setFieldsValue(Ivrblastcarriercampaign);
        setIsModalVisible(true);
    };

    const handleDelete = (email) => {
        // You can add confirmation before deletion here
        const updatedData = data.filter(Ivrblastcarriercampaign => Ivrblastcarriercampaign.email !== email);
        notification.success({
            message: 'Ivrblast Carrier Deleted',
            description: 'The Ivrblast Carrier has been successfully deleted.',
        });
        // Ideally, you should update your data source state here
    };

    const handleCancel = () =>{
        setIsModalVisible(false);
        setEditingCampaign(null);
    }


    const filteredData = filterData(searchText, selectedDepartment, selectedRole);

    const columns = [
        {
            title: "S.no.",
            key: "sno",
            render: (_, __, index) => index + 1,
        },
        {
            title: "Campaign name",
            dataIndex: "campaignname",
            key: "campaignname",
        },
        {
            title: "Process",
            dataIndex: "process",
            key: "process",
        },
        {
            title: "Dial Method",
            dataIndex: "dialmethod",
            key: "dialmethod",
        },
        {
            title: "Ratio Level",
            dataIndex: "ratiolevel",
            key: "ratiolevel",
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <div>
                    <a onClick={() => handleEdit(record)} ><FaRegEdit className='Ivrblastcarriercampaign_edit_icon' /></a>
                    <Popconfirm
                        title="Are you sure to delete this Ivrblast Carrier?"
                        onConfirm={() => handleDelete(record.email)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <a><MdDeleteOutline className='Ivrblastcarriercampaign_deletes_icon' /></a>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <div className='Ivrblastcarriercampaign_container'>
            <div className='Ivrblastcarriercampaign_header'>
                <p className='Ivrblastcarriercampaign_heading'>Campaign</p>
                <div className='Ivrblastcarriercampaign_header_input'>
                    <Input
                        className='Ivrblastcarriercampaign_search_input'
                        placeholder="Search Campaign name"
                        prefix={<IoIosSearch />}
                        onChange={(curr) => setSearchText(curr.target.value)}
                    />
                    <Button type='primary' onClick={showModal}>
                        <IoIosAdd className='add_Ivrblastcarriercampaign_btn_icon' />Add Campaign
                    </Button>
                </div>
            </div>

            {/* Modal for Adding/Editing Ivrblastcarriercampaign */}
            <Modal
                title={editingCampaign ? "Edit Campaign" : "Add Campaign"}
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                destroyOnClose
            >
                <Form form={form} onFinish={handleSubmit} className="add_Ivrblastcarriercampaign_form" layout="vertical">

                    <div className='create_Ivrblastcarriercampaign_layout'>
                        <Form.Item
                            label="CAMPAIGN NAME"
                            name="campaignname"
                            rules={[
                                { required: true, message: 'Please input the Campaign Name!' }
                            ]}
                        >
                            <Input style={{ width: 230 }} />
                        </Form.Item>

                        <Form.Item
                            label="PROCESS"
                            name="process"
                            rules={[{ required: true, message: 'Please input the process!' }]}
                        >
                            <Input style={{ width: 230 }} />
                        </Form.Item>
                    </div>

                    <div className='create_Ivrblastcarriercampaign_layout'>
                        <Form.Item
                            label="DIAL METHOD"
                            name="dialmethod"
                            rules={[
                                { required: true, message: 'Please input the Dial method!' }
                            ]}
                        >
                            <Input style={{ width: 230 }} />
                        </Form.Item>

                        <Form.Item
                            label="RATIO LEVEL"
                            name="Ratiolevel"
                            rules={[
                                { required: true, message: 'Please input a port!' },
                            ]}
                        >
                            <Input style={{ width: 230 }} />
                        </Form.Item>
                    </div>


                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block >
                            {loading ? <Spin /> : 'Save Campaign'}
                        </Button>
                    </Form.Item>


                </Form>

            </Modal>

            <div style={{ padding: 20 }}>


                <Table
                    columns={columns}
                    dataSource={filteredData}
                    rowKey="email"
                />
            </div>
        </div>
    );
}

export default Campaign;
