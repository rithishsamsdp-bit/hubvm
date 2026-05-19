import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, Form, Skeleton, Table, Popconfirm } from 'antd';
import { IoIosAdd } from "react-icons/io";
import { IoIosSearch } from "react-icons/io";
import "./style/Carrier.css";
import { FaRegEdit } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings } from '../../store/Settings.js';



const Carrier = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const [form] = Form.useForm();
    const { Carrierdatas, CarrierTotalDatas, CarrierFetch, GetCarrier, CarrierModelChange, CarrierModel, CarrierLoader, EditCarrier, createCarrier, DeleteCarrier, carrierCheck } = Settings();

    const [searchText, setSearchText] = useState("");
    const [limit, setLimit] = useState(parseInt(params.get('per_page')) || 10);
    const [page, setPage] = useState(parseInt(params.get('page')) || 1);
    const [offset, setOffset] = useState((parseInt(params.get('page')) - 1) * limit || 0);
    const [carrierIdToEdit, setCarrierIdToEdit] = useState(null);
    const [CarrierNameToEdit, setCarrierNameToEdit] = useState('');



    useEffect(() => {
        GetCarrier(limit, offset, searchText);
    }, [limit, offset, searchText, page]);


    useEffect(() => {
        const editingCarrierId = params.get('carrierId');

        if (editingCarrierId) {
            setCarrierIdToEdit(editingCarrierId);
            CarrierModelChange(true);
            const carrierData = Carrierdatas.find(carrier => carrier.a_id == editingCarrierId);

            if (carrierData) {
                form.setFieldsValue({
                    a_trunkName: carrierData.a_trunkName,
                    a_secret: carrierData.a_secret,
                    a_host: carrierData.a_host,
                    a_port: carrierData.a_port,
                    a_prefend: carrierData.a_prefend
                });
            }

            navigate(`/settings/carrier?page=${page}&per_page=${limit}&carrierId=${editingCarrierId}`);
        } else {
            CarrierModelChange(false);
            navigate(`/settings/carrier?page=${page}&per_page=${limit}`);
        }
    }, [Carrierdatas, page, limit]);


    const handleSubmit = async (values) => {
        if (carrierIdToEdit != null) {
            let data ;

            if(values.a_prefend != ''){
                data = {
                    trunkName: values.a_trunkName,
                    secret: values.a_secret,
                    host: values.a_host,
                    port: values.a_port,
                    prefend: values.a_prefend,
                    carrierid: carrierIdToEdit
                }
            }else{
                data = {
                    trunkName: values.a_trunkName,
                    secret: values.a_secret,
                    host: values.a_host,
                    port: values.a_port,
                    carrierid: carrierIdToEdit
                }
            }
            await EditCarrier(data);
            CloseCarrierModel();
            GetCarrier(limit, offset, searchText);
        } else {
            await createCarrier(values);
            form.resetFields();
            setOffset(0);
            setPage(1);
            GetCarrier(limit, 0, searchText);
        }

    };

    const handleEdit = (data) => {
        navigate(`/settings/carrier?page=${page}&per_page=${limit}&carrierId=${data.a_id}`);
        setCarrierIdToEdit(data.a_id);
        setCarrierNameToEdit(data.a_trunkName);
        CarrierModelChange(true);
        form.setFieldsValue(data);
    };

    const handleDelete = async (id) => {
        let data = {
            carrierid: id
        }
        await DeleteCarrier(data);
        console.log("Deleted");
        setOffset(0);
        setPage(1);
        GetCarrier(limit, 0, searchText);
    };

    //model functions

    const OpenCarrierModel = () => {
        CarrierModelChange(true);
    }

    const CloseCarrierModel = () => {
        CarrierModelChange(false);
        form.resetFields();
        setCarrierIdToEdit(null);
        navigate(`/settings/carrier?page=${page}&per_page=${limit}`);
    }

    const columns = [
        {
            title: "S.NO.",
            key: "sno",
            render: (_, __, index) => offset + index + 1,
        },
        {
            title: "Carrier Name",
            dataIndex: "a_trunkName",
            key: "a_trunkName",
        },
        {
            title: "Secret",
            dataIndex: "a_secret",
            key: "a_secret",
        },
        {
            title: "Prefix",
            dataIndex: "a_prefend",
            key: "a_prefend",
        },
        {
            title: "Host",
            dataIndex: "a_host",
            key: "a_host",
        },
        {
            title: "Port",
            dataIndex: "a_port",
            key: "a_port",
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <div>
                    <a onClick={() => handleEdit(record)} ><FaRegEdit className='carrier_edit_icon' /></a>
                    <Popconfirm
                        title="Are you sure to delete this Carrier?"
                        onConfirm={() => handleDelete(record.a_id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <a><MdDeleteOutline className='carrier_deletes_icon' /></a>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <div className='carrier_container'>
            <div className='carrier_header'>
                <p className='carrier_heading'>Carrier</p>
                <div className='carrier_header_input'>
                    <Input
                        className='carrier_search_input'
                        placeholder="Search Trunk name/Host"
                        prefix={<IoIosSearch />}
                        onChange={(curr) => setSearchText(curr.target.value)}
                    />
                    <Button type='primary' onClick={OpenCarrierModel}>
                        <IoIosAdd className='add_carrier_btn_icon' /> Add Carrier
                    </Button>
                </div>
            </div>

            {/* Modal for Adding/Editing carrier */}
            <Modal
                title={carrierIdToEdit ? "Edit Carrier" : "Add Carrier"}
                open={CarrierModel}
                onCancel={CloseCarrierModel}
                footer={null}
                destroyOnClose
            >
                <Form form={form} onFinish={handleSubmit} className="add_carrier_form" layout="vertical">
                    {!CarrierFetch ? (
                        <>
                            <div className='create_carrier_layout'>
                                <Form.Item
                                    label="Trunk Name"
                                    name="a_trunkName"
                                    rules={[
                                        { required: true, message: 'Please input the Trunk Name!' }, {
                                            validator: async (_, value) => {
                                                if (!value) return;
                                                if (carrierIdToEdit) {
                                                    if (CarrierNameToEdit == value) return;

                                                    const response = await carrierCheck(value);
                                                    if (response?.res?.data?.data) {
                                                        return Promise.reject('This Carrier name already exists. Please choose a different name.');
                                                    }
                                                } else {
                                                    const response = await carrierCheck(value);
                                                    if (response?.res?.data?.data) {
                                                        return Promise.reject('This Carrier name already exists. Please choose a different name.');
                                                    }
                                                }

                                            },
                                        },
                                    ]}
                                >
                                    <Input style={{ width: 230 }} />
                                </Form.Item>

                                <Form.Item
                                    label="Secret"
                                    name="a_secret"
                                    rules={[{ required: true, message: 'Please input the Secret!' }]}
                                >
                                    <Input style={{ width: 230 }} />
                                </Form.Item>
                            </div>

                            <div className='create_carrier_layout'>
                                <Form.Item
                                    label="Prefix"
                                    name="a_prefend"
                                >
                                    <Input style={{ width: 230 }} />
                                </Form.Item>

                                <Form.Item
                                    label="Host"
                                    name="a_host"
                                    rules={[
                                        { required: true, message: 'Please input the Host!' }
                                    ]}
                                >
                                    <Input style={{ width: 230 }} />
                                </Form.Item>

                            </div>

                            <div className='create_carrier_layout'>

                                <Form.Item
                                    label="Port"
                                    name="a_port"
                                    rules={[
                                        { required: true, message: 'Please input a port!' },
                                    ]}
                                >
                                    <Input style={{ width: 230 }} />
                                </Form.Item>
                            </div>


                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={CarrierLoader} block >
                                    {CarrierLoader ? '' : carrierIdToEdit != null ? 'Save' : 'Add Carrier'}
                                </Button>
                            </Form.Item>
                        </>

                    ) : (<Skeleton active paragraph={{ rows: 4 }} />)}


                </Form>

            </Modal>

            <div style={{ padding: 20 }}>
                <div className='carrier_filter_section'>
                    <div className='carrier_filters'>

                    </div>
                    {/* <p>Total data:{CarrierTotalDatas}</p> */}

                </div>


                <Table
                    columns={columns}
                    dataSource={Carrierdatas}
                    loading={CarrierFetch}
                    rowKey="a_id"
                    size={"small"}
                    bordered={"enable"}
                    pagination={{
                        current: page,
                        pageSize: limit,
                        total: CarrierTotalDatas,
                        onChange: (page,size) => {
                            // setOffset((page - 1) * limit);
                            setPage(page);
                            setOffset((size*page)-size);
                        },
                        showSizeChanger: true,
                        onShowSizeChange: (current, size) => {
                            setLimit(size);
                            // setOffset(0);
                        },
                        position: ["bottomLeft"],
                        showTotal: () => `Total: ${CarrierTotalDatas}`,
                    }}
                />
            </div>
        </div>
    );
}

export default Carrier;
