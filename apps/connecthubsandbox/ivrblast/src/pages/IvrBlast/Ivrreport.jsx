import React, { useState, useEffect } from 'react';
import "./style/Ivrreport.css";


import { Input, Table, Tag, Tooltip, DatePicker, Select, Skeleton, Button } from 'antd';
import { IoIosSearch } from "react-icons/io";
import { IvrBlast } from '../../store/IvrBlast.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { HiPhoneOutgoing, HiPhoneMissedCall } from "react-icons/hi";
import { FaDownload } from "react-icons/fa6";
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const dateFormat = 'YYYY-MM-DD';
const Ivrreport = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const params = new URLSearchParams(location.search);
    const { GetIvrreport, Ivrreportdata, IvrReportTotalDatas, IvrReportfetch, GetCampaignFilterfetch, IvrCampaignfilterdata, GetCampaignFilterapi } = IvrBlast();
    const [searchText, setSearchText] = useState("");
    const [limit, setLimit] = useState(parseInt(params.get('per_page')) || 10);
    const [page, setPage] = useState(parseInt(params.get('page')) || 1);
    const [offset, setOffset] = useState((parseInt(params.get('page')) - 1) * limit || 0);
    const [startDate, setStartDate] = useState(dayjs().startOf('day'));
    const [endDate, setEndDate] = useState(dayjs().endOf('day'));
    const [campaignFilter, setCampaignFilter] = useState('');


    useEffect(() => {
        GetCampaignFilterapi();
    }, [])

    useEffect(() => {
        GetIvrreport(limit, offset, searchText, startDate, endDate, campaignFilter);
    }, [limit, offset, searchText, page, startDate, endDate, campaignFilter]);

    useEffect(() => {
        navigate(`/ivrblast/Ivrblastreport?page=${page}&per_page=${limit}`);
    }, [Ivrreportdata, page, limit]);


    const columns = [
        {
            title: "S.NO.",
            key: "sno",
            render: (_, __, index) => {
                // Check if data is still loading
                // if (IvrReportfetch) {
                //     return <Skeleton.Input size="small" active style={{ width: 20 }} />;
                // }
                return offset + index + 1; // Once data is loaded, calculate S.NO.
            },
        },
        {
            title: "Campaign",
            dataIndex: "i_campaignName",
            key: "i_campaignName",
        },
        {
            title: "Call Date",
            dataIndex: "i_callDate",
            key: "i_callDate",
        },
        {
            title: "Call Type",
            dataIndex: "i_callType",
            key: "i_callType",
            render: (_, record) => {
                if (["outbound", "Outbound", "OUTBOUND", "Outgoing", "outgoing", "OUTGOING"].includes(record.i_callType)) {
                    if (["ANSWER", "answer", "Answer", "answered", "Answered", "ANSWERED"].includes(record.i_disposition)) {
                        return (<Tooltip title="Outgoing(Answer)"><HiPhoneOutgoing className='ivrReport_tabel_icons_answer_color' /></Tooltip>);
                    }
                    else if (["NO ANSWER", "no answer", "No Answer", "no answered", "No Answered", "No ANSWERED"].includes(record.i_disposition)) {
                        return (<Tooltip title="Outgoing(No Answer)"><HiPhoneOutgoing className='ivrReport_tabel_icons_noanswer_color' /></Tooltip>)
                    }
                    else if (["BUSY", "Busy", "busy"].includes(record.i_disposition)) {
                        return (<Tooltip title="Outgoing(Busy)"><HiPhoneMissedCall className='ivrReport_tabel_icons_busy_color' /></Tooltip>)
                    }
                    else {
                        return record.i_callType
                    }

                } else if (["inbound", "Inbound", "INBOUND", "Incoming", "incoming", "INCOMING"].includes(record.i_callType)) {
                    return "Incoming";
                }
                return text;
            },
        },
        {
            title: "Source",
            dataIndex: "i_source",
            key: "i_source",
        },
        {
            title: "Destination",
            dataIndex: "i_destination",
            key: "i_destination",
        },
        {
            title: "Duration",
            dataIndex: "i_duration",
            key: "i_duration",
            render: (i_duration) => {
                if (i_duration && i_duration !== '') {
                    const hours = Math.floor(i_duration / 3600);
                    const minutes = Math.floor((i_duration % 3600) / 60);
                    const seconds = i_duration % 60;

                    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }
                return '';
            },
        },
        {
            title: "Disposition",
            dataIndex: "i_disposition",
            key: "i_disposition",
            render: (text) => {
                if (["ANSWER", "answer", "Answer", "answered", "Answered", "ANSWERED"].includes(text)) {
                    return <Tag color="green">{text}</Tag>;
                }
                else if (["NO ANSWER", "no answer", "No Answer", "no answered", "No Answered", "No ANSWERED"].includes(text)) {
                    return <Tag color="red">{text}</Tag>;
                }
                else if (["BUSY", "Busy", "busy"].includes(text)) {
                    return <Tag color="gold">{text}</Tag>;
                }
                return text;
            },
        },
        {
            title: "User Input",
            dataIndex: "i_userInput",
            key: "i_userInput",
        }


    ];

    const handleDateChange = (dates) => {
        if (dates) {
            setStartDate(dates[0]);
            setEndDate(dates[1]);

        }
        else {
            setStartDate(dayjs().startOf('day'));
            setEndDate(dayjs().endOf('day'));
        }
    };

    const handleCampaignChange = (value) => {
        setCampaignFilter(value ?? '');
    }

    const handleexport = () => {
        const columnsObject = columns
            .filter(column => column.key !== "sno")  // Exclude the column with key "sno"
            .reduce((acc, column) => {
                acc[column.key] = column.title;
                return acc;
            }, {});

        let start_date_formate = startDate.format('YYYY-MM-DD HH:mm:ss');
        let end_date_formate = endDate.format('YYYY-MM-DD HH:mm:ss');
        const columnsObjectString = encodeURIComponent(JSON.stringify(columnsObject));


        const url = `http://connecthub.pulsework360.com/telephony/cdr/export?start_date=${encodeURIComponent(start_date_formate)}&end_date=${encodeURIComponent(end_date_formate)}&database=pulsef6dafca5d2ddf0949dd251508abd654f&selected_columns=${columnsObjectString}&filename=IvrBlast-CDR}`;

        window.location.href = url;

    }

    return (
        <div className='ivrReport_container'>
            <div className='ivrReport_header'>
                <p className='ivrReport_heading'>Report</p>
                <div className='ivrReport_header_input'>
                    {GetCampaignFilterfetch ? (<Skeleton.Button size="small" active style={{ width: '100px' }} />)
                        : (
                            <Button type='primary' onClick={handleexport}>
                                <FaDownload className='add_IvrReport_btn_icon' /> Export
                            </Button>
                        )}

                </div>
            </div>


            <div style={{ padding: 20 }}>
                <div className='ivrReport_filter_section'>
                    <div className='ivrReport_filters'>
                        {GetCampaignFilterfetch ? (
                            <>
                                <Skeleton.Input size="small" active style={{ width: '250px' }} />
                                <Skeleton.Input size="small" active style={{ width: '160px' }} />
                            </>
                        ) : (
                            <>
                                <RangePicker
                                    showTime
                                    value={[startDate, endDate]}
                                    format={dateFormat}
                                    onChange={handleDateChange}
                                    style={{ width: '250px' }}
                                />
                                <Select
                                    showSearch
                                    placeholder="Select Campaign"
                                    optionFilterProp="label"
                                    allowClear
                                    onChange={handleCampaignChange}
                                    options={IvrCampaignfilterdata.map(campaign => ({
                                        value: campaign.i_campaignId,
                                        label: campaign.i_campaignName,
                                    }))}
                                    style={{ width: '160px' }}
                                />
                            </>
                        )}
                    </div>
                    {GetCampaignFilterfetch ? (
                        <>
                            <Skeleton.Input size="small" active className='ivrReport_search_input' />
                        </>
                    ) : (
                        <Input
                            className='ivrReport_search_input'
                            placeholder="Search Campaign / Source / Destination"
                            prefix={<IoIosSearch />}
                            onChange={(curr) => setSearchText(curr.target.value)}
                        />
                    )}


                </div>

                <Table
                    size={"small"}
                    bordered={"enable"}
                    columns={columns}
                    dataSource={Ivrreportdata}
                    loading={IvrReportfetch}
                    rowKey="i_uniqueId"
                    pagination={{
                        current: page,
                        pageSize: limit,
                        total: IvrReportTotalDatas,
                        onChange: (page, size) => {
                            setPage(page);
                            setOffset((size * page) - size);
                            // setOffset((page - 1) * limit);
                        },
                        showSizeChanger: true,
                        onShowSizeChange: (current, size) => {
                            setLimit(size);
                        },
                        position: ["bottomLeft"],
                        showTotal: (total) => `Total: ${total}`,
                    }}

                />
            </div>
        </div>
    );
}

export default Ivrreport;
