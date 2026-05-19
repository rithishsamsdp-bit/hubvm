import React, { useState, useEffect, useContext } from 'react'
import { Handle } from "reactflow";
import userContext from '../../../Contexter';
import "./Dail.css";

function Queue({ id }) {
  const contexter = useContext(userContext);

  const [filteredData, setFilteredData] = useState({});
  useEffect(() => {
    const nodeData = contexter.nodes.find((el) => el.id === id)?.data;
    setFilteredData(nodeData);
  }, [contexter.nodes, id]);
  return (
    <div className='Dail-main-container'>
      <Handle type="target" position="left" id="0" style={{ marginLeft: '-5px'}} isConnectable={true} 
        isValidConnection={(connection) => {
          return false;
        }}/>
      <div className='Dail-heding-container'><h2 className='Dail-heding'>Queue</h2></div>
      <hr />
      <span>
        <span style={{ color: 'black' }}>Queue name</span>
        <br />
        <span style={{ backgroundColor: '#8A939F33', color: 'black', paddingLeft: '3px', paddingRight: '3px', borderRadius: '3px' }}>
          {filteredData?.value?.agent ?? ""}
        </span>
      </span>
      <br />
      Ring Time {filteredData.value?.ringtime || "0"} sec
      <br />
      {filteredData.value?.option ? (
        <>
          <span style={{ color: 'black' }}>Option</span>
          <span style={{ backgroundColor: '#8A939F33', color: 'black', paddingLeft: '3px', paddingRight: '3px', borderRadius: '3px' }}>
            {filteredData.value.option.length > 7 ?
              `${filteredData.value.option.substring(0, 7)}...` :
              filteredData.value.option}
          </span>
        </>
      ) : (
        <></>
      )}


      <Handle type="source" position="right" className="queue-atten-call" id="1" style={{marginRight: '-5px'}} isConnectable={true} 
        isValidConnection={(connection) => {
          // console.log(connection);
          let data = contexter.nodes;
          let nodeWithId = data.find(node => node.id === connection.target);
          if (nodeWithId && nodeWithId.type) {
            let nodetype = nodeWithId.type;
            return nodetype === "Hangup" || nodetype === "Api";
          }
          return false;
        }}/>
      <Handle type="source" position="right"  className="queue-hang-up"  id="2" style={{marginRight: '-5px'}}/>
    </div>
  )
}

export default Queue
