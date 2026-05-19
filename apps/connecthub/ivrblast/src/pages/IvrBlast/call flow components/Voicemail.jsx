import React, { useState, useEffect, useContext } from 'react'
import { Handle } from "reactflow";
import userContext from '../../../Contexter';
import "./Dail.css";

function Voicemail({ id }) {
  const contexter = useContext(userContext);

  const [filteredData, setFilteredData] = useState({});
  useEffect(() => {
    const nodeData = contexter.nodes.find((el) => el.id === id)?.data;
    setFilteredData(nodeData);
  }, [contexter.nodes, id]);
  return (
    <div className='Dail-main-container'>
      <Handle type="target" position="left" id="0" style={{ marginLeft: '-5px'}} isConnectable={true} isValidConnection={(connection) => {
          return false;
        }}/>
      <div className='Dail-heding-container'><h2 className='Dail-heding'>Voicemail</h2></div>
      <hr />
      <span>
                    <span style={{ color: 'black' }}>Agent</span>
                    <br/>
                    <span style={{ backgroundColor: '#8A939F33', color: 'black', paddingLeft: '3px', paddingRight: '3px', borderRadius: '3px' }}>
                    {filteredData?.value?.agent ?? ""}
                    </span>
                    <br/>
                    <span style={{ color: 'black' }}>Option :</span>
                    <span style={{ backgroundColor: '#8A939F33', color: 'black', paddingLeft: '3px', paddingRight: '3px', borderRadius: '3px' }}>
                    {filteredData?.value?.option ?? ""}
                    </span>

                </span>

      <Handle type="source" position="right" id="1" style={{marginRight: '-5px'}}/>
    </div>
  )
}

export default Voicemail
