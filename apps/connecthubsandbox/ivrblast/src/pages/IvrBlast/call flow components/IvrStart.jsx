import React from 'react'
import { Handle } from "reactflow";

import "./Ivrstart.css";

function IvrStart({ id }) {

  return (
    <div className='Ivr-Start-main-container'>
      <div className='Ivr-Start-heading-container'><h2 className='Ivr-start-heading'>IVR Flow Start</h2></div>
      <Handle type="source" position="right" id="1"/>
    </div>
  )
}

export default IvrStart