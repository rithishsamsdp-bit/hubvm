import React, { useState, useEffect, useContext } from 'react'
import { Handle } from "reactflow";
import userContext from '../../../Contexter';
import "./Dail.css";

function Variables({ id }) {
    const contexter = useContext(userContext);

    const [filteredData, setFilteredData] = useState({});
    useEffect(() => {
        const nodeData = contexter.nodes.find((el) => el.id === id)?.data;
        setFilteredData(nodeData);
    }, [contexter.nodes, id]);
    return (
        <div className='Dail-main-container'>
            <Handle type="target" position="left" id={`0`} style={{ marginLeft: '-5px' }} isValidConnection={(connection) => {
                return false;
            }} />
            <div className='Dail-heding-container'><h2 className='Dail-heding'>variable</h2></div>
            <hr />
            <span>
                <span style={{ color: 'black' }}>Key</span>
                <span style={{ backgroundColor: '#8A939F33', color: 'black', paddingLeft: '3px', paddingRight: '3px', borderRadius: '3px' }}>
                    {filteredData?.value?.key ?? ""}
                </span>
            </span>
            <br />
            <span>
                <span style={{ color: 'black' }}>Value</span>
                <span style={{ backgroundColor: '#8A939F33', color: 'black', paddingLeft: '3px', paddingRight: '3px', borderRadius: '3px' }}>
                    {filteredData?.value?.value ?? ""}
                </span>
            </span>


            <Handle type="source" position="right" id="1" style={{ marginRight: '-5px' }} />
        </div>
    )
}

export default Variables
