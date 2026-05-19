import React from 'react'
import { Handle } from "reactflow";
import { MdOutlineCallEnd } from "react-icons/md";
import "./Hangup.css";

function Hangup({ id }) {

  return (
    <div className='Ivr-Hangup-main-container'>
      <Handle type="target" position="left" id="0" style={{ marginLeft: '-5px' }} isConnectable={true} isValidConnection={(connection) => {
        return false;
      }} />
      <div className='Ivr-Hangup-heading-container'><MdOutlineCallEnd/><h2 className='Ivr-Hangup-heading'>Hangup</h2></div>
      <Handle type="source" position="right" id="1" style={{ marginRight: '-5px' }} />
    </div>
  )
}

export default Hangup
