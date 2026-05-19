import React, { useState, useEffect } from 'react';
import { Table, Popconfirm, Modal, Form, Input, DatePicker, Radio, Button, Upload } from 'antd';
import moment from 'moment';
import { FaRegEdit } from 'react-icons/fa';
import { MdDeleteOutline } from 'react-icons/md';
import { InboxOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
const Holiday = () => {
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [data, setData] = useState([]);
    const [tableLoading, setTableLoading] = useState(false);
    const [holidaymodel, setholidaymodel] = useState(false);
    const [mediaType, setMediaType] = useState(null);
    const [loading, setLoading] = useState(false);

    const [form] = Form.useForm();
    const { RangePicker } = DatePicker;


    // Dummy data
    const dummyData = [
        {
            Id: '1',
            name: 'New Year',
            start_date: '2025-01-01',
            end_date: '2025-01-01',
            message: 'Hi thank you for calling us. Today is a public holiday for New Year.',
            audio_name: 'link_to_audio_file_1.mp3',
            msg_enable: "true",
            audio_enable: "false"
        },
        {
            Id: '2',
            name: 'Christmas Day',
            start_date: '2024-12-25',
            end_date: '2024-12-25',
            message: 'Merry Christmas! Our office is closed today in celebration of Christmas.',
            audio_name: 'link_to_audio_file_2.mp3',
            msg_enable: "false",
            audio_enable: "true"
        },
        {
            Id: '3',
            name: 'Labor Day',
            start_date: '2025-05-01',
            end_date: '2025-05-01',
            message: 'Happy Labor Day! We are out of the office today in honor of workers.',
            audio_name: 'link_to_audio_file_3.mp3',
            msg_enable: "true",
            audio_enable: "false"
        },
        {
            Id: '4',
            name: 'Independence Day',
            start_date: '2025-07-04',
            end_date: '2025-07-04',
            message: 'We are closed today for Independence Day celebrations.',
            audio_name: 'link_to_audio_file_4.mp3',
            msg_enable: "false",
            audio_enable: "true"
        },
        {
            Id: '5',
            name: 'Thanksgiving',
            start_date: '2024-11-28',
            end_date: '2024-11-28',
            message: 'Happy Thanksgiving! Our office is closed today.',
            audio_name: 'link_to_audio_file_5.mp3',
            msg_enable: "true",
            audio_enable: "false"
        },
        {
            Id: '6',
            name: 'Valentine\'s Day',
            start_date: '2025-02-14',
            end_date: '2025-02-14',
            message: 'Happy Valentine\'s Day! We are open today to assist you.',
            audio_name: 'link_to_audio_file_6.mp3',
            msg_enable: "false",
            audio_enable: "true"
        }
    ];
    


    useEffect(() => {
        setData(dummyData);
        // Set the dummy data to the state
    }, []);

    const onSelectChange = (selectedKeys) => {
        setSelectedRowKeys(selectedKeys);
    };

    const columns = [
        {
            title: "S.NO.",
            key: "sno",
            render: (_, __, index) => 0 + index + 1,
        },
        {
            title: "Name",
            dataIndex: "name",
            key: "Name",
        },
        {
            title: "Start date",
            dataIndex: "start_date",
            key: "start_date",
            width: 100,
        },
        {
            title: "End date",
            dataIndex: "end_date",
            key: "end_date",
            width: 100,
        },
        {
            title: "Message",
            dataIndex: "message",
            key: "message",
        },
        {
            title: "Audio",
            dataIndex: "audio_name",
            key: "audio_name",
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <div>
                    <a onClick={() => editHolidaymodalopen(record)}><FaRegEdit className='Users_edit_icon' /></a>
                    <Popconfirm
                        title="Are you sure to delete this Holiday?"
                        onConfirm={() => handleDelete(record.Id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <a><MdDeleteOutline className='users_deletes_icon' /></a>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    const handleEdit = (record) => {
        // Add your edit logic here
        console.log('Editing:', record);
    };

    const handleDelete = (id) => {
        // Add your delete logic here
        console.log('Deleting:', id);
    };

    const addHolidaymodelclose = () => {
        setholidaymodel(false);
        form.resetFields();
        setMediaType(null);
    }


    const editHolidaymodalopen = (record) => {
        setholidaymodel(true);
        if (record.msg_enable === "true") {
            record.mediaType = "message";
        } else if (record.audio_enable === "true") {
            record.mediaType = "audio";
        }

        setMediaType(record.mediaType);
        console.log(record)

        form.setFieldsValue({ ...record, date: [dayjs(record.start_date), dayjs(record.end_date)] });


    }

    const handleSubmit = async (values) => {
        console.log(values);
    }





    const handleMediaTypeChange = (e) => {
        setMediaType(e.target.value);
    };



    return (
        <div>



            <Table
                size={"small"}
                bordered={false}
                columns={columns}
                rowSelection={{
                    selectedRowKeys,
                    onChange: onSelectChange,
                }}
                dataSource={data}
                loading={tableLoading}
                rowKey="Id"
                pagination={false}
            />



            <Modal
                title={"Edit Holiday"}
                open={holidaymodel}
                onCancel={addHolidaymodelclose}
                footer={null}
                destroyOnClose
                width={800}
                maskClosable={false}
            >
                <Form form={form} onFinish={handleSubmit} className="add_users_form" layout="horizontal">
                    <Form.Item
                        label="Name"
                        name="name"
                        rules={[{ required: true, message: 'Please input the name!' }]}
                        labelCol={{ span: 4 }}
                        wrapperCol={{ span: 18 }}
                    >
                        <Input style={{ width: '250px' }} />
                    </Form.Item>

                    <Form.Item
                        label="Date"
                        name="date"
                        rules={[{ required: true, message: 'Please input the date!' }]}
                        labelCol={{ span: 4 }}
                        wrapperCol={{ span: 18 }}
                    >
                        <RangePicker style={{ width: '250px' }} />
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
                        <Form.Item
                            label="Upload Audio"
                            name="audio_name"
                            rules={[{ required: true, message: 'Please upload an audio file!' }]}
                            labelCol={{ span: 4 }}
                            wrapperCol={{ span: 18 }}
                        >
                            <Upload.Dragger
                                name="file"
                                action="/upload"
                                showUploadList={true}
                                maxCount={1}
                                accept=".mp3,.wav"
                                beforeUpload={file => {
                                    const isValid = file.type === 'audio/mp3' || file.type === 'audio/wav';
                                    if (!isValid) {
                                        message.error('You can only upload MP3 or WAV files!');
                                    }
                                    return isValid; // This will prevent the upload from starting until the form is submitted
                                }}
                            >
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined />
                                </p>
                                <p className="ant-upload-text">Click or drag an audio file to this area to upload</p>
                            </Upload.Dragger>
                        </Form.Item>
                    )}

                    <Form.Item
                        wrapperCol={{ span: 24 }}
                    >
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            {loading ? '' : "save Holiday"}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>


        </div>
    );
}

export default Holiday;
