import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, Form, Skeleton, Table, Popconfirm } from 'antd';
import { IoIosAdd } from "react-icons/io";
import { IoIosSearch } from "react-icons/io";
import "./style/Ivrblastcarrier.css";
import { FaRegEdit } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";
import { useLocation, useNavigate } from 'react-router-dom';
import { IvrBlast } from '../../store/IvrBlast.js';



const Ivrblastcarrier = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const [form] = Form.useForm();
    const { Carrierdatas, CarrierTotalDatas, CarrierFetch, GetCarrier, CarrierModelChange, CarrierModel, IvrCarrierLoader, EditCarrier, createCarrier, DeleteCarrier, carrierCheck } = IvrBlast();

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
            const carrierData = Carrierdatas.find(carrier => carrier.i_carrierId == editingCarrierId);

            if (carrierData) {
                form.setFieldsValue({
                    i_carrierName: carrierData.i_carrierName,
                    i_carrierSecret: carrierData.i_carrierSecret,
                    i_carrierHost: carrierData.i_carrierHost,
                    i_carrierPort: carrierData.i_carrierPort,
                    i_carrierPrefix: carrierData.i_carrierPrefix
                });
            }

            navigate(`/ivrblast/carriercreation?page=${page}&per_page=${limit}&carrierId=${editingCarrierId}`);
        } else {
            CarrierModelChange(false);
            navigate(`/ivrblast/carriercreation?page=${page}&per_page=${limit}`);
        }
    }, [Carrierdatas, page, limit]);


    const handleSubmit = async (values) => {
        if (carrierIdToEdit != null) {
            let data ;

            if(values.i_carrierPrefix != ''){
                data = {
                    carriername: values.i_carrierName,
                    carriersecret: values.i_carrierSecret,
                    carrierhost: values.i_carrierHost,
                    carrierport: values.i_carrierPort,
                    carrierprefix: values.i_carrierPrefix,
                    carrierid: carrierIdToEdit
                }
            }else{
                data = {
                    carriername: values.i_carrierName,
                    carriersecret: values.i_carrierSecret,
                    carrierhost: values.i_carrierHost,
                    carrierport: values.i_carrierPort,
                    carrierid: carrierIdToEdit
                }
            }
            await EditCarrier(data);
            CloseIvrCarrierModel();
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
        navigate(`/ivrblast/carriercreation?page=${page}&per_page=${limit}&carrierId=${data.i_carrierId}`);
        setCarrierIdToEdit(data.i_carrierId);
        setCarrierNameToEdit(data.i_carrierName);
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

    const OpenIvrCarrierModel = () => {
        CarrierModelChange(true);
    }

    const CloseIvrCarrierModel = () => {
        CarrierModelChange(false);
        form.resetFields();
        setCarrierIdToEdit(null);
        navigate(`/ivrblast/carriercreation?page=${page}&per_page=${limit}`);
    }

    const columns = [
        {
            title: "S.NO.",
            key: "sno",
            render: (_, __, index) => offset + index + 1,
        },
        {
            title: "Carrier Name",
            dataIndex: "i_carrierName",
            key: "i_carrierName",
        },
        {
            title: "Secret",
            dataIndex: "i_carrierSecret",
            key: "i_carrierSecret",
        },
        {
            title: "Prefix",
            dataIndex: "i_carrierPrefix",
            key: "i_carrierPrefix",
        },
        {
            title: "Host",
            dataIndex: "i_carrierHost",
            key: "i_carrierHost",
        },
        {
            title: "Port",
            dataIndex: "i_carrierPort",
            key: "i_carrierPort",
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <div>
                    <a onClick={() => handleEdit(record)} ><FaRegEdit className='Ivrblastcarrier_edit_icon' /></a>
                    <Popconfirm
                        title="Are you sure to delete this Ivrblast Carrier?"
                        onConfirm={() => handleDelete(record.i_carrierId)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <a><MdDeleteOutline className='Ivrblastcarrier_deletes_icon' /></a>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <div className='Ivrblastcarrier_container'>
            <div className='Ivrblastcarrier_header'>
                <p className='Ivrblastcarrier_heading'>Ivrblast Carrier</p>
                <div className='Ivrblastcarrier_header_input'>
                    <Input
                        className='Ivrblastcarrier_search_input'
                        placeholder="Search Trunk name/Host"
                        prefix={<IoIosSearch />}
                        onChange={(curr) => setSearchText(curr.target.value)}
                    />
                    <Button type='primary' onClick={OpenIvrCarrierModel}>
                        <IoIosAdd className='add_Ivrblastcarrier_btn_icon' /> Add Ivrblast Carrier
                    </Button>
                </div>
            </div>

            {/* Modal for Adding/Editing Ivrblastcarrier */}
            <Modal
                title={carrierIdToEdit ? "Edit Ivrblast Carrier" : "Add Ivrblast Carrier"}
                open={CarrierModel}
                onCancel={CloseIvrCarrierModel}
                footer={null}
                destroyOnClose
            >
                <Form form={form} onFinish={handleSubmit} className="add_Ivrblastcarrier_form" layout="vertical">
                    {!CarrierFetch ? (
                        <>
                            <div className='create_Ivrblastcarrier_layout'>
                                <Form.Item
                                    label="Trunk Name"
                                    name="i_carrierName"
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
                                    name="i_carrierSecret"
                                    rules={[{ required: true, message: 'Please input the Secret!' }]}
                                >
                                    <Input style={{ width: 230 }} />
                                </Form.Item>
                            </div>

                            <div className='create_Ivrblastcarrier_layout'>
                                <Form.Item
                                    label="Prefix"
                                    name="i_carrierPrefix"
                                >
                                    <Input style={{ width: 230 }} />
                                </Form.Item>

                                <Form.Item
                                    label="Host"
                                    name="i_carrierHost"
                                    rules={[
                                        { required: true, message: 'Please input the Host!' }
                                    ]}
                                >
                                    <Input style={{ width: 230 }} />
                                </Form.Item>

                            </div>

                            <div className='create_Ivrblastcarrier_layout'>

                                <Form.Item
                                    label="Port"
                                    name="i_carrierPort"
                                    rules={[
                                        { required: true, message: 'Please input a port!' },
                                    ]}
                                >
                                    <Input style={{ width: 230 }} />
                                </Form.Item>
                            </div>


                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={IvrCarrierLoader} block >
                                    {IvrCarrierLoader ? '' : carrierIdToEdit != null ? 'Save' : 'Add Carrier'}
                                </Button>
                            </Form.Item>
                        </>

                    ) : (<Skeleton active paragraph={{ rows: 4 }} />)}


                </Form>

            </Modal>

            <div style={{ padding: 20 }}>
                <div className='ivrCampaign_filter_section'>
                    <div className='ivrCampaign_filters'>

                    </div>
                    {/* <p>Total data:{CarrierTotalDatas}</p> */}

                </div>


                <Table
                    columns={columns}
                    dataSource={Carrierdatas}
                    loading={CarrierFetch}
                    rowKey="i_carrierId"
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

export default Ivrblastcarrier;
