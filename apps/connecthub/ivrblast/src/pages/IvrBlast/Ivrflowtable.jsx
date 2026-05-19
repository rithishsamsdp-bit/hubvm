import React, {  useState,useContext, useEffect } from 'react';
import { Button, Tag, Spin, Empty,Popconfirm ,Input} from 'antd';
import { useNavigate } from 'react-router-dom';
import "./style/Ivrflowtable.css";
import userContext from "../../Contexter.js";





//icons
import { FaRegEdit } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import { IvrBlast } from '../../store/IvrBlast';
import { IoIosSearch } from "react-icons/io";



const Ivrflowtable = () => {
    const navigate = useNavigate();
    const contexter = useContext(userContext);
    const { GetIvrflow, IvrFlowdata, IvrFlowdataTotalDatas, FlowdataFetch, DeleteIvrFlow } = IvrBlast();

    const [searchText, setSearchText] = useState('')

    useEffect(() => {
        GetIvrflow(searchText);
    }, [searchText])

    const createflowfun = () => {
        contexter.setNodes([
            {
                id: "1",
                type: "IvrStart",
                data: { value: "IVR Flow Start" },
                position: { x: 300, y: 30 }
            }
        ]);
        contexter.setinitialEdges([]);
        navigate('/ivrblast/Ivrflowcreation');

    };

    const flowview = (data) => {
        navigate(`/ivrblast/Ivrflowview?FlowId=${data.i_flowId}`);
    };

    const flowedit = (data) => {
        navigate(`/ivrblast/Ivrflowedit?FlowId=${data.i_flowId}`);
    };

    const flowDelete = async (id) => {
        let data = {
            flow_id: id
        };
        await DeleteIvrFlow(data);
        GetIvrflow();
    };

    return (
        <div className='Ivr_flow_table_container'>
            <div className='Ivr_flow_table_header'>
                <p className='Ivr_flow_table_heading'>Flow</p>
                <div className='Ivr_flow_table_header_input'>
                    <Input
                        className='Ivrcampaign_search_input'
                        placeholder="Search Ivr name"
                        prefix={<IoIosSearch />}
                        onChange={(curr) => setSearchText(curr.target.value)}
                    />
                    <Button type='primary' onClick={createflowfun}>
                        Create Flow
                    </Button>
                </div>
            </div>


            {/* <div className="skeleton-loader">
                            <Skeleton active paragraph={{ rows: 5 }} />
                        </div> */}

            <div className='Ivr_flow_table_container_2'>


                {
                    FlowdataFetch ? (

                        <div div className="Ivr_flow_table-loading-container">
                            <Spin size="large" />
                        </div>
                    ) : (
                        (Array.isArray(IvrFlowdata) && IvrFlowdata.length > 0) ? (
                            IvrFlowdata.map((flow, index) => (
                                <div key={index} className='Ivr_flow_table_value_container'>
                                    <p className='Ivr_flow_table_value_name'>{flow.i_flowName}</p>
                                    <Tag color="blue">
                                        <p className='Ivr_flow_table_value_time'>{flow.flow_time}</p>
                                    </Tag>
                                    <div className='Ivr_flow_table_value_icons_container'>
                                        <FaRegEye className='Ivr_flow_table_value_container_View_icons' onClick={() => flowview(flow)} />
                                        <FaRegEdit className='Ivr_flow_table_value_container_Edit_icons' onClick={() => flowedit(flow)} />
                                        <Popconfirm
                                            title="Are you sure to delete this Campaign?"
                                            onConfirm={() => flowDelete(flow.i_flowId)}
                                            okText="Yes"
                                            cancelText="No"
                                        >
                                            <MdDeleteOutline className='Ivr_flow_table_value_container_Delete_icons' />
                                        </Popconfirm>

                                    </div>
                                </div>
                            ))
                        ) : (
                            <Empty
                                description={
                                    <>
                                        <span>
                                            No Data Found
                                        </span>
                                        <br />
                                        <br />
                                        <Button type="primary" onClick={createflowfun}>Create Flow</Button>
                                    </>

                                }
                            />
                        )
                    )
                }






            </div>
        </div >
    );
}

export default Ivrflowtable;
