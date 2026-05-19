import React, { useState, useEffect, useContext } from 'react'
import { Handle } from "reactflow";
import userContext from '../../../Contexter';
import "./Dail.css";

function Api({ id }) {
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
      <div className='Dail-heding-container'><h2 className='Dail-heding'>Api</h2></div>
      <hr />
      <span>
        <span style={{ color: 'black' }}>Method</span>
        <br />
        <span style={{ backgroundColor: '#8A939F33', color: 'black', paddingLeft: '3px', paddingRight: '3px', borderRadius: '3px' }}>
          {filteredData?.value?.Method ?? ""}
        </span>
      </span>
      <br />
      <span style={{ color: 'black' }}>URL :</span>
      {filteredData.value?.URL ?? ""}
      <br />
      {filteredData.value?.AdditionalData ? (
        <>
          <span style={{ color: 'black' }}>AdditionalData</span>
          <br />
          <span style={{ backgroundColor: '#8A939F33', color: 'black', paddingLeft: '3px', paddingRight: '3px', borderRadius: '3px', }}>
            {filteredData.value.AdditionalData}
          </span>
        </>
      ) : (
        <></>
      )}

      <Handle type="source" position="right" id="1" style={{marginRight: '-5px'}}/>
    </div>
  )
}

export default Api
