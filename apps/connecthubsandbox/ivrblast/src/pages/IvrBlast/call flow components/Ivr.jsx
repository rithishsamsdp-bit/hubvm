import React, { useState, useEffect, useContext } from 'react'
import { Handle } from "reactflow";
import userContext from '../../../Contexter';
import "./Ivr.css";

function Ivr({ id }) {
  const contexter = useContext(userContext);

  const [filteredData, setFilteredData] = useState({});
  useEffect(() => {
    console.log("running")
    const nodeData = contexter.nodes.find((el) => el.id === id)?.data;
    const data = nodeData?.value?.Ivr;
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    setFilteredData(parsedData);
  }, [contexter.nodes, id]);
  return (
    <div className='Ivrflow-ivr-main-container'>
      <Handle type="target" position="left" id="0" style={{ marginLeft: '-5px', marginTop: '15px' }} isConnectable={true} isValidConnection={(connection) => {
        return false;
      }} />
      <div className='Ivrflow-ivr-heading-container'>
        <h2 className='Ivrflow-heding'>Ivr
        </h2>
      </div>
      <div className='Ivrflow-ivr-text-fields'>
        <p className='Ivrflow-ivr-text-fields-text'>IVR:&nbsp; <span className={filteredData?.v_voiceresponseName ? 'Ivrflow-ivr-text-fields-text-span' : ''}>  {filteredData?.v_voiceresponseName ?? "Not selected"}</span></p>
      </div>

      <Handle type="source" position="right" id="1" style={{ marginRight: '-5px', marginTop: '15px' }} />
    </div>
  )
}

export default Ivr
