import React from "react";
import { Collapse, Table, Tag } from "antd";



import { FaRegEdit } from 'react-icons/fa';
import { MdDeleteOutline } from 'react-icons/md';



const { Panel } = Collapse;


const ScheduleTable = () => {
  const columns = [
    {
      title: "Day",
      dataIndex: "day",
      key: "day",
      render: (text) => <b>{text}</b>,
    },
    {
      title: "Morning Shift",
      dataIndex: "morning",
      key: "morning",
    },
    {
      title: "Afternoon Shift",
      dataIndex: "afternoon",
      key: "afternoon",
    },
  ];

  const data1 = [
    {
      key: "1",
      day: "Monday",
      morning: "09:00 AM - 01:00 PM",
      afternoon: "01:30 PM - 05:00 PM",
    },
    {
      key: "2",
      day: "Tuesday",
      morning: "09:00 AM - 01:00 PM",
      afternoon: "01:30 PM - 05:00 PM",
    },
    {
      key: "3",
      day: "Wednesday",
      morning: "09:00 AM - 01:00 PM",
      afternoon: "01:30 PM - 05:00 PM",
    },
    {
      key: "4",
      day: "Thursday",
      morning: "09:00 AM - 01:00 PM",
      afternoon: "01:30 PM - 05:00 PM",
    },
    // Additional rows...
  ];

  const data2 = [
    {
      key: "1",
      day: "Monday",
      morning: "08:00 AM - 12:00 PM",
      afternoon: "12:30 PM - 04:00 PM",
    },
    {
      key: "2",
      day: "Tuesday",
      morning: "08:00 AM - 12:00 PM",
      afternoon: "12:30 PM - 04:00 PM",
    },
    // Additional rows...
  ];

  const data3 = [
    {
      key: "1",
      day: "Monday",
      morning: "07:00 AM - 11:00 AM",
      afternoon: "11:30 AM - 03:00 PM",
    },
    {
      key: "2",
      day: "Tuesday",
      morning: "07:00 AM - 11:00 AM",
      afternoon: "11:30 AM - 03:00 PM",
    },
    // Additional rows...
  ];

  return (
    <Collapse  collapsible="icon" defaultActiveKey={["1"]}>
      <Panel
        header={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>9-5 Weekdays - PST</span>
            <Tag color="blue">2022 US Holidays</Tag>
            <div style={{display:"flex",gap:'2px'}}>
                <FaRegEdit className='Users_edit_icon' />
            <MdDeleteOutline className='users_deletes_icon'/>
            </div>
            
          </div>
        }
        key="1"
      >
        <Table
          columns={columns}
          dataSource={data1}
          bordered
          pagination={false}
          style={{ width: "100%" }}
        />
      </Panel>
      
      <Panel
        header={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>8-4 Weekdays - PST</span>
            <Tag color="green">Custom Holidays</Tag>
            <div style={{display:"flex",gap:'2px'}}>
                <FaRegEdit className='Users_edit_icon' />
            <MdDeleteOutline className='users_deletes_icon'/>
            </div>
          </div>
        }
        key="2"
      >
        <Table
          columns={columns}
          dataSource={data2}
          bordered
          pagination={false}
          style={{ width: "100%" }}
        />
      </Panel>
      
      <Panel
        header={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>7-3 Weekdays - PST</span>
            <Tag color="red">Emergency Coverage</Tag>
            <div style={{display:"flex",gap:'2px'}}>
                <FaRegEdit className='Users_edit_icon' />
            <MdDeleteOutline className='users_deletes_icon'/>
            </div>
          </div>
        }
        key="3"
      >
        <Table
          columns={columns}
          dataSource={data3}
          bordered
          pagination={false}
          style={{ width: "100%" }}
        />
      </Panel>
    </Collapse>
  );
};

export default ScheduleTable;
