import React, { useState } from 'react';
import "./style/Businessholiday.css";

import { Tabs, Button, Modal, Form, Input, DatePicker, Radio, Upload, notification, Drawer } from 'antd';
import Holiday from './BusinessHoliday/Holiday';
import Business from "./BusinessHoliday/Business";

// Icons
import { IoIosAdd } from "react-icons/io";
import { InboxOutlined } from '@ant-design/icons';

const Businessholiday = () => {
    const storedActiveKey = sessionStorage.getItem('Settings_holiday_tab') || '1';
    const [activeKey, setActiveKey] = useState(storedActiveKey);
    const [holidaymodel, setholidaymodel] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mediaType, setMediaType] = useState(null);
    const [error, setError] = useState(null);


    const [businessmodel, setbusinessmodel] = useState(false);


    const [form] = Form.useForm();
    const { RangePicker } = DatePicker;


    const items = [
        {
            label: 'Business Hours',
            key: '1',
            children: <Business />,
        },
        {
            label: 'Holidays',
            key: '2',
            children: <Holiday />,
        }
    ];

    const handleTabChange = (key) => {
        setActiveKey(key);
        sessionStorage.setItem('Settings_holiday_tab', key);
    };

    const addBusinessmodel = () => {
        setbusinessmodel(true);
    };

    const addHolidaymodelopen = () => {
        // Add Holiday model logic here
        setholidaymodel(true)
    };

    const addHolidaymodelclose = () => {
        setholidaymodel(false);
        form.resetFields();
        setMediaType(null);
    }

    const addbusinessmodelclose = () => {
        setbusinessmodel(false);
        form.resetFields();
    }

    const handleMediaTypeChange = (e) => {
        setMediaType(e.target.value);
    };
    const handleSubmitHoliday = async (values) => {
        setLoading(true);

        console.log(values)
        const [startDate, endDate] = values.date;
        const mediaType = values.mediaType;
        const { audio_name, ...formData } = values;
        // Remove the 'date' field as it's no longer needed


        console.log(mediaType)
        const formattedStartDate = startDate.format('YYYY:MM:DD');
        const formattedEndDate = endDate.format('YYYY:MM:DD');
        const msg_enable = (mediaType == "message" ? "true" : "false");
        const audio_enable = (mediaType == "audio" ? "true" : "false");
        // const audio_name = (audio_enable == "false" ? "" : "" );


        let HolidayData;
        if (audio_enable == "false") {
            HolidayData = {
                ...values,
                start_date: formattedStartDate,
                end_date: formattedEndDate,
                msg_enable,
                audio_enable,
                audio_name: ''
            };
        }

        if (msg_enable == "false") {
            if (audio_name && audio_name.fileList && audio_name.fileList.length > 0) {
                const file = audio_name.fileList[0]; // Get the first file in the list
                const fileName = file.name; // Access the file name

                HolidayData = {
                    ...values,
                    audio_name: fileName,
                    start_date: formattedStartDate,
                    end_date: formattedEndDate,
                    msg_enable,
                    audio_enable,
                    message: ''
                };
            }
        }

        delete HolidayData.date;
        delete HolidayData.mediaType;
        console.log(HolidayData)
        try {
            const response = await fakeApiCall(HolidayData);
            if (response.status === 'success') {
                notification.success({
                    message: 'Holiday Added',
                    description: 'The Holiday has been successfully added.',
                });
                form.resetFields();
                setholidaymodel(false);
            }
        } catch (error) {
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while adding the Holiday.',
            });
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

    return (
        <div className='Businessholiday_container'>
            <Tabs
                tabBarExtraContent={
                    activeKey === "1" ? (
                        <Button type='primary' onClick={addBusinessmodel}>
                            <IoIosAdd className='add_Businessholiday_btn_icon' /> Add
                        </Button>
                    ) : activeKey === "2" ? (
                        <Button type='primary' onClick={addHolidaymodelopen}>
                            <IoIosAdd className='add_Businessholiday_btn_icon' /> Add
                        </Button>
                    ) : null
                }
                items={items}
                activeKey={activeKey}
                onChange={handleTabChange}
            />



            <Modal
                title={"Add Holiday"}
                open={holidaymodel}
                onCancel={addHolidaymodelclose}
                footer={null}
                destroyOnClose
                width={800}
                maskClosable={false}
            >
                <Form form={form} onFinish={handleSubmitHoliday} className="add_users_form" layout="horizontal">
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
                                    return isValid;
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
                            {loading ? '' : "Add Holiday"}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>



            <Drawer
                title={"Add Bussiness hours"}
                onClose={addbusinessmodelclose}
                open={businessmodel}
                destroyOnClose
                width={800}
                maskClosable={false}
            >



            </Drawer>

        </div>
    );
}

export default Businessholiday;
