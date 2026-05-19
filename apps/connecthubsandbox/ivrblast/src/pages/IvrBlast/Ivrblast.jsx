import React from 'react';
import "./style/Ivrblast.css";
import { useParams, useNavigate } from 'react-router-dom';
import { Error } from '../common';
import Ivrblastcarrier from './Ivrblastcarrier';
import Ivrflow from './Ivrflow';
import Ivrcreation from './Ivrcreation';
import Ivrcampaign from './Ivrcampaign';
import Ivrflowtable from './Ivrflowtable';
import Ivrflowview from "./Ivrflowview";
import Ivrflowedit from './Ivrflowedit';
import Ivrreport from './Ivrreport';
const Ivrblast = () => {

  const { item } = useParams();
  const navigate = useNavigate();

  const handleItemClick = (newItem) => {
    navigate(`/ivrblast/${newItem}`);
  };

  return (
    <div className='ivrblast_container'>
      <div className='ivrblast_container_1'>
        <div className='ivrblast_heading_container'>
          <p className='ivrblast_heading'>ivrblast</p>
        </div>
        <div className={`ivrblast_text_container ${item === 'campaigncreation' ? 'ivrtextcontaineractive' : ''}`} onClick={() => handleItemClick('campaigncreation')}>
          <p className={`ivrblast_text ${item === 'campaigncreation' ? 'textactive' : ''}`}>Campaign</p>
        </div>
        <div className={`ivrblast_text_container ${item === 'carriercreation' ? 'ivrtextcontaineractive' : ''}`} onClick={() => handleItemClick('carriercreation')}>
          <p className={`ivrblast_text ${item === 'carriercreation' ? 'textactive' : ''}`}>Carrier</p>
        </div>
        <div className={`ivrblast_text_container ${item === 'Ivrflow' || item === 'Ivrflowcreation' || item === 'Ivrflowview' || item === 'Ivrflowedit' ? 'ivrtextcontaineractive' : ''}`} onClick={() => handleItemClick('Ivrflow')}>
          <p className={`ivrblast_text ${item === 'Ivrflow' || item === 'Ivrflowcreation' || item === 'Ivrflowview' || item === 'Ivrflowedit' ? 'textactive' : ''}`}>Ivrflow</p>
        </div>

        <div className={`ivrblast_text_container ${item === 'Ivrcreation' ? 'ivrtextcontaineractive' : ''}`} onClick={() => handleItemClick('Ivrcreation')}>
          <p className={`ivrblast_text ${item === 'Ivrcreation' ? 'textactive' : ''}`}>Ivrcreation</p>
        </div>
        <div className={`ivrblast_text_container ${item === 'Ivrblastreport' ? 'ivrtextcontaineractive' : ''}`} onClick={() => handleItemClick('Ivrblastreport')}>
          <p className={`ivrblast_text ${item === 'Ivrblastreport' ? 'textactive' : ''}`}>Report</p>
        </div>


      </div>
      <div className='ivrblast_container_2'>
        {item === 'carriercreation' && <Ivrblastcarrier />}
        {item === 'Ivrflowcreation' && <Ivrflow />}
        {item === 'campaigncreation' && <Ivrcampaign />}
        {item === 'Ivrcreation' && <Ivrcreation />}
        {item === 'Ivrflow' && <Ivrflowtable />}
        {item === 'Ivrflowview' && <Ivrflowview />}
        {item === 'Ivrflowedit' && <Ivrflowedit />}
        {item === 'Ivrblastreport' && <Ivrreport/>}
        {!['carriercreation', 'Ivrflowcreation', 'campaigncreation', 'Ivrcreation', 'Ivrblastreport', 'Ivrflow', 'Ivrflowview', 'Ivrflowedit'].includes(item) && <Error />}

      </div>
    </div>
  )
}

export default Ivrblast
