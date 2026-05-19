import React, { useEffect, useState } from 'react';
import { Button, Input, Modal, Form, Table, Popconfirm, Radio, Upload, notification } from 'antd';
import "./style/Ivrcreation.css";
import { MdDeleteOutline } from "react-icons/md";
import { InboxOutlined } from '@ant-design/icons';
import { IoIosAdd } from "react-icons/io";
import { IoIosSearch } from "react-icons/io";
import { IvrBlast } from '../../store/IvrBlast';
import { useLocation, useNavigate } from 'react-router-dom';


const Ivrcreation = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const { GetIvr, Ivrdata, IvrdataTotalDatas, IvrCreationLoader, IvrCreationModelChange, IvrCreationModel, Ivrdatafetch, createIvrCreation, IvrCreationCheck, DeleteIvrCreation } = IvrBlast();


    const [form] = Form.useForm();
    const [searchText, setSearchText] = useState("");
    const [limit, setLimit] = useState(parseInt(params.get('per_page')) || 10);
    const [page, setPage] = useState(parseInt(params.get('page')) || 1);
    const [offset, setOffset] = useState((parseInt(params.get('page')) - 1) * limit || 0);
    const [mediaType, setMediaType] = useState(null);
    const [audioType, setAudioType] = useState(null);

    useEffect(() => {
        GetIvr(limit, offset, searchText);
    }, [limit, offset, searchText, page]);

    useEffect(() => {
        navigate(`/ivrblast/Ivrcreation?page=${page}&per_page=${limit}`);
    }, [page, limit]);

    const handleSubmit = async (values) => {

        await createIvrCreation(values);
        form.resetFields();
        setMediaType(null);
        setAudioType(null);
        setOffset(0);
        setPage(1);
        GetIvr(limit, 0, searchText);
    };

    const handleDelete = async (record) => {
        let data = {
            voiceresponseid: record.v_voiceresponseId,
            voiceresponsename: record.v_voiceresponseName

        }
        await DeleteIvrCreation(data);

        setOffset(0);
        setPage(1);
        GetIvr(limit, 0, searchText);
    };

    const handleMediaTypeChange = (e) => {
        setMediaType(e.target.value);
    };

    const handleAudioTypeChange = (e) => {
        setAudioType(e.target.value);
    };

    // model function 

    const OpenIvrcreationModel = () => {
        IvrCreationModelChange(true);

    };

    const CloseIvrcreationModel = () => {
        IvrCreationModelChange(false);
        form.resetFields();
        setMediaType(null);
        setAudioType(null);
    }

    const columns = [
        {
            title: "S.NO.",
            key: "sno",
            render: (_, __, index) => 0 + index + 1,
        },
        {
            title: "Ivr Name",
            dataIndex: "v_voiceresponseName",
            key: "v_voiceresponseName",
        },

        {
            title: "Audio",
            dataIndex: "v_voiceresponseUrl",
            key: "v_voiceresponseUrl",
            render: (url) => (
                <audio controls style={{ height: "40px" }}>
                    <source src={url} type="audio/wav" />
                    Your browser does not support the audio element.
                </audio>
            ),
            width: 200
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <div>
                    <Popconfirm
                        title="Are you sure to delete this Ivr?"
                        onConfirm={() => handleDelete(record)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <a><MdDeleteOutline className='users_deletes_icon' /></a>
                    </Popconfirm>
                </div>
            ),
            width: 60
        },
    ];


    return (
        <div className='Ivrcreation_container'>
            <div className='Ivrcreation_header'>
                <p className='Ivrcreation_heading'>Ivr Creation</p>
                <div className='Ivrcreation_header_input'>
                    <Input
                        className='Ivrcreation_search_input'
                        placeholder="Search Ivr name"
                        prefix={<IoIosSearch />}
                        onChange={(curr) => setSearchText(curr.target.value)}
                    />
                    <Button type='primary' onClick={OpenIvrcreationModel}>
                        <IoIosAdd className='add_Ivrcreation_btn_icon' /> Add Ivr
                    </Button>
                </div>
            </div>

            {/* Modal for Adding/Editing Ivrcreation */}
            <Modal
                title={"Add Ivr"}
                open={IvrCreationModel}
                onCancel={CloseIvrcreationModel}
                footer={null}
                destroyOnClose
                width={800}
                maskClosable={false}
            >
                <Form form={form} onFinish={handleSubmit} className="add_ivr_creation_form" layout="horizontal">
                    <Form.Item
                        label="Name"
                        name="name"
                        rules={[{ required: true, message: 'Please input the name!' },
                        {
                            validator: async (_, value) => {
                                if (!value) return;
                                const response = await IvrCreationCheck(value);
                                if (response?.res?.data?.data) {
                                    return Promise.reject('This Ivr name already exists. Please choose a different name.');
                                }
                            },
                        },
                        ]}
                        labelCol={{ span: 4 }}
                        wrapperCol={{ span: 18 }}
                    >
                        <Input style={{ width: '250px' }} />
                    </Form.Item>

                    <Form.Item
                        label="Media Type"
                        name="mediaType"
                        rules={[{ required: true, message: 'Please input the media type!' }]}
                        labelCol={{ span: 4 }}
                        wrapperCol={{ span: 18 }}
                    >
                        <Radio.Group onChange={handleMediaTypeChange}>
                            <Radio value="message">Message</Radio>
                            <Radio value="audio">Audio</Radio>
                        </Radio.Group>
                    </Form.Item>

                    {mediaType === 'message' && (
                        <Form.Item
                            label="Message"
                            name="message"
                            rules={[{ required: true, message: 'Please input the message!' }]}
                            labelCol={{ span: 4 }}
                            wrapperCol={{ span: 18 }}
                        >
                            <Input.TextArea rows={4} />
                        </Form.Item>
                    )}

                    {mediaType === 'audio' && (
                        <>
                            <Form.Item
                                label="Audio Type"
                                name="audioType"
                                rules={[{ required: true, message: 'Please select an audio type!' }]}
                                labelCol={{ span: 4 }}
                                wrapperCol={{ span: 18 }}
                            >
                                <Radio.Group onChange={handleAudioTypeChange}>
                                    <Radio value="url">URL</Radio>
                                    <Radio value="upload">Upload Audio</Radio>
                                </Radio.Group>
                            </Form.Item>

                            {audioType === 'url' && (
                                <Form.Item
                                    label="Audio URL"
                                    name="audioUrl"
                                    rules={[{ required: true, message: 'Please input the audio URL!' }]}
                                    labelCol={{ span: 4 }}
                                    wrapperCol={{ span: 18 }}
                                >
                                    <Input placeholder="Enter Audio URL" />
                                </Form.Item>
                            )}

                            {audioType === 'upload' && (
                                <Form.Item
                                    label="Upload Audio"
                                    name="audio_name"
                                    rules={[{ required: true, message: 'Please upload an audio file!' }]}
                                    labelCol={{ span: 4 }}
                                    wrapperCol={{ span: 18 }}
                                >
                                    <Upload.Dragger
                                        name="file"
                                        showUploadList={true}
                                        maxCount={1}
                                        accept=".mp3,.wav"
                                        beforeUpload={file => {
                                            const isValid = file.type === 'audio/mpeg' || file.type === 'audio/wav' ||file.type === 'audio/mp4'||file.type === 'audio/mp3' ;
                                            if (!isValid) {

                                                notification.error({
                                                    message: 'Error',
                                                    description: ('You can only upload MP3 or WAV files!'),
                                                });
                                            }
                                            return false;
                                        }}
                                    >
                                        <p className="ant-upload-drag-icon">
                                            <InboxOutlined />
                                        </p>
                                        <p className="ant-upload-text">Click or drag an audio file to this area to upload</p>
                                        <p className="ant-upload-hint">Only MP3 or WAV audio files are allowed</p>
                                    </Upload.Dragger>
                                </Form.Item>
                            )}
                        </>
                    )}

                    <Form.Item
                        wrapperCol={{ span: 24 }}
                    >
                        <Button type="primary" htmlType="submit" loading={IvrCreationLoader} block>
                            {IvrCreationLoader ? '' : 'Add Ivr'}
                        </Button>
                    </Form.Item>
                </Form>


            </Modal>

            <div style={{ padding: 20 }}>
                <div className='ivrCreation_filter_section'>
                    <div className='ivrCreation_filters'>

                    </div>
                    {/* <p>Total data:{IvrdataTotalDatas}</p> */}

                </div>


                <Table
                    columns={columns}
                    dataSource={Ivrdata}
                    loading={Ivrdatafetch}
                    rowKey="v_voiceresponseId"
                    size={"small"}
                    bordered={"enable"}
                    pagination={{
                        current: page,
                        pageSize: limit,
                        total: IvrdataTotalDatas,
                        onChange: (page,size) => {
                            // setOffset((page - 1) * limit);
                            setPage(page);
                            setOffset((size*page)-size);
                        },
                        showSizeChanger: true,
                        onShowSizeChange: (current, size) => {
                            setLimit(size);
                        },
                        position: ["bottomLeft"],
                        showTotal: () => `Total: ${IvrdataTotalDatas}`,
                    }}
                />
            </div>
        </div>
    );
}

export default Ivrcreation;
