import React, { useState, useEffect } from 'react';
import "./style/Ivrcampaign.css";


import { Button, Input, Modal, Form, notification, Upload, Table, Popconfirm, Skeleton, Tag, Select, Tooltip } from 'antd';
import { } from "react-icons/io";
import { IoIosSearch, IoIosAdd } from "react-icons/io";
import { FaCaretRight } from "react-icons/fa6";
import { IvrBlast } from '../../store/IvrBlast.js';
import { FaRegEdit } from "react-icons/fa";
import { MdDeleteOutline, MdRestartAlt, MdOutlinePause } from "react-icons/md";
import { FaDownload } from "react-icons/fa6";
import { HiSpeakerphone } from "react-icons/hi";
import { InboxOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from "xlsx";


const IvrCampaign = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const { GetCampaign, Campaigndatas, CampaignTotalDatas, CampaignFetch, CampaignModel, CampaignModelChange, createCampaign, IvrCampaignLoader, EditCampaign, DeleteCampaign, campaignCheck, getFlowCarrierLoader, getFlowCarrier, carrierlist, flowlist, RunCampaign, StopCampaign, RestartCampaign, ResumeCampaign } = IvrBlast();
  const [searchText, setSearchText] = useState("");
  const [limit, setLimit] = useState(parseInt(params.get('per_page')) || 10);
  const [page, setPage] = useState(parseInt(params.get('page')) || 1);
  const [offset, setOffset] = useState((parseInt(params.get('page')) - 1) * limit || 0);
  const [campaignIdToEdit, setCampaignIdToEdit] = useState(null);
  const [campaignNameToEdit, setcampaignNameToEdit] = useState("");
  const [inputValues, setInputValues] = useState({});
  const [disabledRatios, setDisabledRatios] = useState({});
  const [loadingRun, setLoadingRun] = useState({});
  const [loadingStop, setLoadingStop] = useState({});
  const [loadingRestart, setLoadingRestart] = useState({});
  const [loadingResume, setLoadingResume] = useState({});




  const [form] = Form.useForm();


  useEffect(() => {
    GetCampaign(limit, offset, searchText);
  }, [limit, offset, searchText, page]);

  useEffect(() => {
    // console.log();
    const editingCampaignId = params.get('campaignId');

    if (editingCampaignId) {

      setCampaignIdToEdit(editingCampaignId);
      CampaignModelChange(true);

      const campaignData = Campaigndatas.find(campaign => campaign.i_campaignId == editingCampaignId);
      // console.log("Campaign Data:", campaignData);
      getFlowCarrier();
      if (campaignData) {
        form.setFieldsValue({
          i_campaignName: campaignData.i_campaignName,
          i_campaignDescription: campaignData.i_campaignDescription,
          i_carrierId: campaignData.i_carrierId,
          i_flowId: campaignData.i_flowId
        });
        setcampaignNameToEdit(campaignData.i_campaignName);
      }


      navigate(`/ivrblast/campaigncreation?page=${page}&per_page=${limit}&campaignId=${editingCampaignId}`);

    } else {
      CampaignModelChange(false);
      navigate(`/ivrblast/campaigncreation?page=${page}&per_page=${limit}`);
    }
  }, [Campaigndatas, page, limit]);

  const handleSubmit = async (values) => {
    if (campaignIdToEdit != null) {
      // console.log(values)
      const selectedCarrierId = values.i_carrierId;

      const selectedFlowId = values.i_flowId;

      const selectedCarrier = carrierlist.find(
        (carrier) => carrier.i_carrierId === selectedCarrierId
      );
      const selectedFlow = flowlist.find((flow) => flow.i_flowId === selectedFlowId);


      let data = {
        campaignname: values.i_campaignName,
        campaigndescription: values.i_campaignDescription,
        carrierid: `${values.i_carrierId}`,
        carriername: `${selectedCarrier.i_carrierName}`,
        flowid: `${values.i_flowId}`,
        flowname: `${selectedFlow.i_flowName}`,
        campaignid: campaignIdToEdit
      }
      // console.log(data);
      await EditCampaign(data);
      CloseIvrCampaignModel();
      GetCampaign(limit, offset, searchText);
    } else {
      // Get the selected carrier ID from the form values
      const selectedCarrierId = values.i_carrierId;

      const selectedFlowId = values.i_flowId;

      const selectedCarrier = carrierlist.find((carrier) => carrier.i_carrierId === selectedCarrierId);

      const selectedFlow = flowlist.find((flow) => flow.i_flowId === selectedFlowId);

      values = { ...values, i_carrierName: selectedCarrier.i_carrierName, i_flowName: selectedFlow.i_flowName }
      await createCampaign(values);
      form.resetFields();
      setOffset(0);
      setPage(1);
      GetCampaign(limit, 0, searchText);
    }
  };

  const handleEdit = (data) => {
    // console.log('Editing row with ID:', data.i_campaignId);
    navigate(`/ivrblast/campaigncreation?page=${page}&per_page=${limit}&campaignId=${data.i_campaignId}`);
    setCampaignIdToEdit(data.i_campaignId);
    setcampaignNameToEdit(data.i_campaignName);
    CampaignModelChange(true);
    getFlowCarrier();
    form.setFieldsValue(data);

  };

  const handleDelete = async (id) => {
    let data = {
      campaignid: id
    };
    await DeleteCampaign(data);
    // console.log("Deleted");
    setOffset(0);
    setPage(1);
    GetCampaign(limit, 0, searchText);
  };

  const handleInputChange = (value, campaignId) => {
    // Ensure the value is a positive number or zero
    const numericValue = Math.max(0, Number(value)); // This ensures no negative values

    if (numericValue < 100) {
      setInputValues((prev) => ({
        ...prev,
        [campaignId]: numericValue,
      }));
    } else {
      setInputValues((prev) => ({
        ...prev,
        [campaignId]: "100",
      }));
    }



    // console.log(numericValue);

  };

  //model functions

  const OpenIvrCampaignModel = () => {
    CampaignModelChange(true);
    getFlowCarrier();
  };

  const CloseIvrCampaignModel = () => {
    CampaignModelChange(false);
    form.resetFields();
    setCampaignIdToEdit(null);
    navigate(`/ivrblast/campaigncreation?page=${page}&per_page=${limit}`);
  };


  // Handle the "Run" action (change status to running)
  const handleRun = async (record) => {
    // console.log(`Running campaign with ID: ${record.i_campaignId}`);
    // console.log(inputValues)

    setLoadingRun((prevState) => ({
      ...prevState,
      [record.i_campaignId]: true,
    }));

    // let data = {
    //   campaign_id: record.i_campaignId,
    //   ratiolimit: inputValues[record.i_campaignId],
    // };

    let data = {
      "ratiolimit": inputValues[record.i_campaignId],
      "campaign_id": record.i_campaignId,
      "callerid_dynamic": {
        "status": "enable",
        "batch_count": 1000
      }
    }

    // console.log(data);

    await RunCampaign(data);
    // Assuming you have a function to update the status (e.g., through API or dispatching actions)
    // await updateCampaignStatus(data);

    setLoadingRun((prevState) => ({
      ...prevState,
      [record.i_campaignId]: false,
    }));

    // After running, refresh the campaign list
    await GetCampaign(limit, offset, searchText);
  };

  // Handle the "Pause" action (change status to stopped)
  const handlePause = async (record) => {
    // console.log(`Pausing campaign with ID: ${record.i_campaignId}`);

    setLoadingStop((prevState) => ({
      ...prevState,
      [record.i_campaignId]: true,
    }));

    let data = {
      campaign_id: record.i_campaignId,
    };
    // console.log(data);
    await StopCampaign(data);
    // Assuming you have a function to update the status (e.g., through API or dispatching actions)
    // await updateCampaignStatus(data); // Implement this function to update status to 'stopped'


    setLoadingStop((prevState) => ({
      ...prevState,
      [record.i_campaignId]: false,
    }));
    // After pausing, refresh the campaign list
    await GetCampaign(limit, offset, searchText);
  };

  // Handle the "Restart" action (change status to running)
  const handleRestart = async (record) => {
    // console.log(`Restarting campaign with ID: ${record.i_campaignId}`);

    setLoadingRestart((prevState) => ({
      ...prevState,
      [record.i_campaignId]: true,
    }));


    let data = {
      campaign_id: record.i_campaignId,
      ratiolimit: record.i_ratio,
    };

    // Assuming you have a function to update the status (e.g., through API or dispatching actions)
    // await updateCampaignStatus(data); // Implement this function to update status to 'running'

    await RestartCampaign(data);

    setLoadingRestart((prevState) => ({
      ...prevState,
      [record.i_campaignId]: false,
    }));

    // After restarting, refresh the campaign list
    await GetCampaign(limit, offset, searchText);
  };


  // Handle the "Resume" action (change status to running)
  const handleResume = async (record) => {
    // console.log(`Resume campaign with ID: ${record.i_campaignId}`);

    setLoadingResume((prevState) => ({
      ...prevState,
      [record.i_campaignId]: true,
    }));


    let data = {
      campaign_id: record.i_campaignId,
    };

    // Assuming you have a function to update the status (e.g., through API or dispatching actions)
    // await updateCampaignStatus(data); // Implement this function to update status to 'running'

    await ResumeCampaign(data);

    setLoadingResume((prevState) => ({
      ...prevState,
      [record.i_campaignId]: false,
    }));

    // After resume, refresh the campaign list
    await GetCampaign(limit, offset, searchText);
  };


  const handleDownload = () => {
    // Data to be added to the Excel sheet
    const data = [
      {
        CampaignsNumbers: "1234567890",
      },
    ];

    // Create a worksheet from the data
    const ws = XLSX.utils.json_to_sheet(data);

    // Create a new workbook and append the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    // Generate a binary string of the Excel file
    const excelFile = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    // Trigger download
    const blob = new Blob([excelFile], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sampleLead.xlsx";
    link.click();
  };


  const columns = [
    {
      title: "S.NO.",
      key: "sno",
      render: (_, __, index) => offset + index + 1,
    },
    {
      title: "Campaign",
      dataIndex: "i_campaignName",
      key: "i_campaignName",
    },
    {
      title: "Description",
      dataIndex: "i_campaignDescription",
      key: "i_campaignDescription",
    },
    {
      title: "Carrier",
      dataIndex: "i_carrierName",
      key: "i_carrierName",
    },
    {
      title: "Flow",
      dataIndex: "i_flowName",
      key: "i_flowName",
    },
    {
      title: "Leads",
      render: (_, record) => {
        const completedLeads = record.c_completedLeads || 0; // Default to 0 if empty or undefined
        const totalLeads = record.c_totalLeads || 0; // Default to 0 if empty or undefined

        return (
          <span style={{ display: "flex" }}>
            {completedLeads}/{totalLeads}
          </span>
        );
      }
    },
    {
      title: "Left",
      // width: 90,
      render: (_, record) => {
        const completedLeads = parseInt(record.c_completedLeads);
        const totalLeads = parseInt(record.c_totalLeads);

        const remainingLeads = isNaN(totalLeads) || isNaN(completedLeads)
          ? 0
          : totalLeads - completedLeads;

        return <span>{remainingLeads}</span>;
      }

    },
    {
      title: "Status",
      dataIndex: "i_status",
      key: "i_status",
      render: (status) => {
        if (status === "pending") {
          return <Tag color="warning">Pending</Tag>;
        }
        if (status === "running") {
          return <Tag color="processing">Running</Tag>;
        }
        if (status === "completed") {
          return <Tag color="success">Completed</Tag>;
        }
        if (status === "failed") {
          return <Tag color="error">Failed</Tag>;
        }
        if (status === "stopped") {
          return <Tag color="default">Stopped</Tag>;
        }
        return <Tag>{status}</Tag>;
      },
    },
    {
      title: "Ratio",
      key: "Ratio",
      dataIndex: 'i_ratio',
      // width: 100,
      render: (_, record) => (
        <div>
          {(record.i_ratio == 0 || record.i_ratio === null || record.i_ratio === '' || typeof record.i_ratio === 'undefined') ? (

            <Input
              type="number"
              value={inputValues[record.i_campaignId]}
              onChange={(e) => handleInputChange(e.target.value, record.i_campaignId)}
              disabled={disabledRatios[record.i_campaignId] || false}
              min={0}
              max={100}
            />

          ) : (
            <span>{record.i_ratio}</span>
          )}
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      // width: 180,
      render: (_, record) => {
        const isRunButtonDisabled = !inputValues[record.i_campaignId] || isNaN(inputValues[record.i_campaignId]);
        const isRunning = record.i_status === "running";
        const isCompleted = record.i_status === "completed";
        const isStopped = record.i_status === "stopped";

        return (
          <div style={{ display: 'flex', marginRight: '10px' }}>
            {/* Show Run button if status is not running or completed */}
            {!isRunning && !isCompleted && !isStopped && (
              <Tooltip title="Run">
                <Button
                  type="primary"
                  className="ivrCampaign_Run_Button"
                  size="small"
                  disabled={isRunButtonDisabled}
                  onClick={() => handleRun(record)}
                  loading={loadingRun[record.i_campaignId]}
                >
                  {loadingRun[record.i_campaignId] ? '' : <HiSpeakerphone />}
                </Button>
              </Tooltip>
            )}

            {/* Show Pause button if status is running */}
            {isRunning && (
              <Tooltip title="Pause">
                <Button
                  type="primary"
                  className="ivrCampaign_Run_Button"
                  size="small"
                  onClick={() => handlePause(record)}
                  loading={loadingStop[record.i_campaignId]}
                >
                  {loadingStop[record.i_campaignId] ? '' : <MdOutlinePause />}
                </Button>
              </Tooltip>
            )}

            {/* Show Restart button if status is stopped */}
            {isStopped && (
              <div style={{ display: 'flex', gap: '5px' }}>
                <Tooltip title="Resume">
                  <Button
                    type="primary"
                    className="ivrCampaign_Run_Button"
                    size="small"
                    onClick={() => handleResume(record)}
                    loading={loadingResume[record.i_campaignId]}
                  >
                    {loadingResume[record.i_campaignId] ? '' : <FaCaretRight />}
                  </Button>
                </Tooltip>
                <Tooltip title="Restart">
                  <Button
                    type="primary"
                    className="ivrCampaign_Run_Button"
                    size="small"
                    onClick={() => handleRestart(record)}
                    loading={loadingRestart[record.i_campaignId]}
                  >
                    {loadingRestart[record.i_campaignId] ? '' : <MdRestartAlt />}
                  </Button>
                </Tooltip>
              </div>

            )}

            <a onClick={() => handleEdit(record)}><FaRegEdit className='ivrCampaign_edit_icon' /></a>
            <Popconfirm
              title="Are you sure to delete this Campaign?"
              onConfirm={() => handleDelete(record.i_campaignId)}
              okText="Yes"
              cancelText="No"
            >
              <a><MdDeleteOutline className='ivrCampaign_deletes_icon' /></a>
            </Popconfirm>


          </div>
        );
      },
    },
  ];




  return (
    <div className='ivrCampaign_container'>
      <div className='ivrCampaign_header'>
        <p className='ivrCampaign_heading'>Campaign</p>
        <div className='ivrCampaign_header_input'>
          <Input
            className='ivrCampaign_search_input'
            placeholder="Search Campaign Name/Description"
            prefix={<IoIosSearch />}
            onChange={(curr) => setSearchText(curr.target.value)}
          />
          <Button type='primary' onClick={OpenIvrCampaignModel}>
            <IoIosAdd className='add_ivrCampaign_btn_icon' /> Add Campaign
          </Button>
        </div>
      </div>

      {/* Modal for Adding/Editing IvrCampaign */}
      <Modal
        title={campaignIdToEdit != null ? "Edit Campaign" : "Add Campaign"}
        open={CampaignModel}
        onCancel={CloseIvrCampaignModel}
        footer={null}
        destroyOnClose
        width={500}
        maskClosable={false}
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          className="add_ivrCampaign_form"
          layout="vertical"
        >
          {/* Conditionally render Skeleton or the form based on CampaignFetch */}
          {!CampaignFetch && !getFlowCarrierLoader ? (
            <>
              <Form.Item
                label="Campaign Name"
                name="i_campaignName"
                rules={[
                  { required: true, message: 'Please input the Campaign Name!' },
                  {
                    validator: async (_, value) => {
                      if (!value) return;
                      if (campaignNameToEdit) {
                        if (campaignNameToEdit == value) return;

                        const response = await campaignCheck(value);
                        if (response?.res?.data?.data) {
                          return Promise.reject('This campaign name already exists. Please choose a different name.');
                        }
                      } else {
                        const response = await campaignCheck(value);
                        if (response?.res?.data?.data) {
                          return Promise.reject('This campaign name already exists. Please choose a different name.');
                        }
                      }
                    },
                  },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="Campaign Description"
                name="i_campaignDescription"
              >
                <Input.TextArea rows={6} />
              </Form.Item>


              <Form.Item
                label="Carrier ID"
                name="i_carrierId"
                rules={[{ required: true, message: 'Please select a Carrier ID!' }]}
              >
                <Select placeholder="Select Carrier Name">
                  {carrierlist.map(carrier => (
                    <Select.Option key={carrier.i_carrierId} value={carrier.i_carrierId}>
                      {carrier.i_carrierName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Add Flow Select Dropdown */}
              <Form.Item
                label="Flow"
                name="i_flowId"
                rules={[{ required: true, message: 'Please select a Flow!' }]}
              >
                <Select placeholder="Select Carrier Name">
                  {flowlist.map(flow => (
                    <Select.Option key={flow.i_flowId} value={flow.i_flowId}>
                      {flow.i_flowName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              {/* Conditionally render the file upload section based on editingIvrCampaign */}

              {campaignIdToEdit == null && (
                <Form.Item
                  label="Upload Excel File"
                  name="importfile"
                  rules={[{ required: true, message: 'Please upload an Excel file!' }]}
                >

                  <Upload.Dragger
                    name="file"
                    showUploadList={true}
                    maxCount={1}
                    accept=".csv,.xls,.xlsx"
                    multiple={false}
                    beforeUpload={(file) => {
                      const isValid =
                        file.type ===
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                        file.type === 'application/vnd.ms-excel' ||
                        file.type === 'text/csv';
                      // console.log(isExcel);
                      if (!isValid) {
                        notification.error({
                          message: 'Error',
                          description: ('Invalid file type. Please upload a CSV, XLS, or XLSX file. '),
                        });

                      }
                      return false;
                    }}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">Click or drag file to this area to upload</p>
                    <p className="ant-upload-hint">Only (.csv,.xls,.xlsx) this Excel files are allowed</p>
                    <a
                      className="ant-upload-text"
                      style={{ cursor: "grab" }}
                      onClick={handleDownload}
                    >
                      <FaDownload /> Click to download sample excel format
                    </a>

                  </Upload.Dragger>

                </Form.Item>
              )}

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={IvrCampaignLoader} block>
                  {IvrCampaignLoader ? '' : campaignIdToEdit != null ? 'Save' : 'Add Campaign'}
                </Button>
              </Form.Item>
            </>
          ) : (
            // Skeleton loader is shown when CampaignFetch is false
            <Skeleton active paragraph={{ rows: 4 }} />
          )}
        </Form>
      </Modal>

      {/* Model for Upload */}

      <div style={{ padding: 20 }}>
        <div className='ivrCampaign_filter_section'>
          <div className='ivrCampaign_filters'>

          </div>
          {/* <p>Total data:{CampaignTotalDatas}</p> */}

        </div>

        <Table
          size={"small"}
          bordered={"enable"}
          columns={columns}
          dataSource={Campaigndatas}
          loading={CampaignFetch}
          rowKey="i_campaignId"
          pagination={{
            current: page,
            pageSize: limit,
            total: CampaignTotalDatas,
            onChange: (page, size) => {
              // setOffset((page - 1) * limit);
              setPage(page);
              setOffset((size * page) - size);
            },
            showSizeChanger: true,
            onShowSizeChange: (current, size) => {
              setLimit(size);
              // setOffset(0);
            },
            position: ["bottomLeft"],
            showTotal: () => `Total: ${CampaignTotalDatas}`,
          }}

        />
      </div>
    </div>
  );
}

export default IvrCampaign;
