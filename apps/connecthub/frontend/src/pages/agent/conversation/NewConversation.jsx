import React from 'react';
import "./styles/NewConversation.css";
import { Button } from '../../../components/Index.jsx';
import { useNavigate } from 'react-router-dom';


const NewConversation = () => {
    const navigate = useNavigate();
    return (
        <div className='newconversation'>
            <div className='newconversation_container'>
                <p className='newconversation_heading'>Start New Conversation</p>
                <p className='newconversation_text'>
                    Start an <strong>Individual Call</strong>. You can choose a number from
                    your <strong>contact book</strong> or enter it manually in the dialpad.
                    Once the call is connected, it will open in your conversation page.
                </p>
                <div className='newconversation_btn_container'>
                    <Button variant='primary' onClick={() => navigate('/agent-contactbook')}>Start New Conversation</Button>
                </div>
            </div>
        </div>
    )
}

export default NewConversation
