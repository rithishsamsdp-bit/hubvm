import React, { memo, useContext, useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import userContext from '../../../Contexter';
import "./IvrGatherinput.css";


const renderOption = (value, key, id) => {
  const [press] = value;
  if (press !== "") {
    return (
      <div style={{ marginTop: '10px', marginBottom: '10px', paddingLeft: '15px', paddingRight: '15px' }}>


        <p className='Ivr-gatherinput-text-fields-text'>Caller presses&nbsp; <span className={press ? 'Ivr-gatherinput-text-fields-text-span' : ''}>      {press.length > 7 ? `${press.slice(0, 7)}...` : press}</span></p>

      </div>
    );
  } else {
    return (
      <div style={{ marginTop: '10px', marginBottom: '10px', paddingLeft: '15px', paddingRight: '15px' }}>
        <p className='Ivr-gatherinput-text-fields-text'>Option {key}</p>
      </div>

    );
  }
};


const IvrGatherinput = ({ id }) => {

  const contexter = useContext(userContext);
  const [filteredData, setFilteredData] = useState({});
  const [filteredData1, setFilteredData1] = useState({});
  const [filteredData2, setFilteredData2] = useState({});
  const [filteredData3, setFilteredData3] = useState({});
  const [filteredData4, setFilteredData4] = useState("");
  const [filteredData5, setFilteredData5] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const nodeData = contexter.nodes.find((el) => el.id === id)?.data.value;
    const nodeData1 = contexter.nodes.find((el) => el.id === id)?.data.GIIvr;
    const parsedData = typeof nodeData1 === 'string' ? JSON.parse(nodeData1) : nodeData1;
    const nodeData2 = contexter.nodes.find((el) => el.id === id)?.data.replay;
    const nodeData3 = contexter.nodes.find((el) => el.id === id)?.data.replayvalue;
    const nodeData4 = contexter.nodes.find((el) => el.id === id)?.data.timeout;
    const nodeData5 = contexter.nodes.find((el) => el.id === id)?.data.option;

    setFilteredData1(parsedData);
    setFilteredData2(nodeData2);
    setFilteredData3(nodeData3);
    setFilteredData4(nodeData4);
    setFilteredData5(nodeData5);

    if (nodeData && typeof nodeData === 'object') {
      const newData = Object.fromEntries(
        Object.entries(nodeData).filter(([_, value]) => value !== undefined)
      );
      setFilteredData(newData);
    }
  }, [contexter.nodes, id]);

  const options = Object.entries(filteredData);
  const totalOptions = options.length;
  const centerIndex = Math.floor(totalOptions / 2);

  // Function to handle connection event
  const onConnect = () => {
    setIsConnected(true);
  };

  return (
    <div className='Ivr-gather-input-container'>
      <Handle type="target" position="left" id={`0`} style={{ marginLeft: '-6px' }} isConnectable={true} isValidConnection={(connection) => {
        return false;
      }} />
      <div className='Ivr-gatherinput-heading-container'>
        <h2 className='Ivr-gatherinput-heading'>Gather Input</h2>
      </div>
      <div className='Ivr-gatherinput-text-fields'>
        <p className='Ivr-gatherinput-text-fields-text'>IVR:&nbsp; <span className={filteredData1?.value ? 'Ivr-gatherinput-text-fields-text-span' : ''}>
          {filteredData1?.v_voiceresponseName ?? "Not selected"}</span></p>
        <p className='Ivr-gatherinput-text-fields-text'>Timeout:&nbsp;<span className={filteredData4 ? 'Ivr-gatherinput-text-fields-text-span' : ''}>{filteredData4}</span></p>
        <p className='Ivr-gatherinput-text-fields-text'>Option:&nbsp; <span className={filteredData5 ? 'Ivr-gatherinput-text-fields-text-span' : ''}>{filteredData5}</span></p>

        {
          filteredData2 == "true" && (
            <>
              <p className='Ivr-gatherinput-text-fields-text'>Replay:&nbsp; <span className={filteredData5 ? 'Ivr-gatherinput-text-fields-text-span' : ''}>{filteredData3 ?? ""}</span></p>
            </>
          )
        }

      </div>

      <hr />
      {options.map(([key, value], index) => (
        <div key={`${id}-${key}`} className='Ivr-value-handle-container'>
          {renderOption(value, key, id)}
          <Handle
            type="source"
            position="right"
            id={`${key}`}
            style={{ marginTop: `-6px`, marginRight: '-5px' }}
          // isConnectable={!isConnected[key]} 
          // onConnect={onConnect} 
          />
          <hr />
        </div>
      ))}
    </div>
  );
};


export default memo(IvrGatherinput);
