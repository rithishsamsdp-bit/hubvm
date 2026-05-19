import React, { useState, useEffect } from 'react';
import "./style/Dialpad.css";
import { Modal, Select, Input, Tooltip, Tag } from 'antd';

//icons
import { MdOutlineCall } from "react-icons/md";
import { MdDialpad } from "react-icons/md";
import { IoMdClose } from "react-icons/io";
import { GoDotFill } from "react-icons/go";
import { IoCallOutline } from "react-icons/io5";
import { RiArrowLeftSLine } from "react-icons/ri";
import { FaCircleUser } from "react-icons/fa6";
import { MdOutlinePhoneForwarded } from "react-icons/md";
import { MdOutlinePhonePaused } from "react-icons/md";
import { AiOutlineAudioMuted } from "react-icons/ai";
import { TbNotes } from "react-icons/tb";
import { MdOutlineCallEnd } from "react-icons/md";
import { MdMerge } from "react-icons/md";

const Dialpad = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [dialstatus, setDialstatus] = useState("");
    const [Mute, setMute] = useState(false);
    const [Hold, setHold] = useState(false);
    const [Transfer, setTransfer] = useState(false);
    const [Notes, setNotes] = useState(false);
    const [transferModalVisible, setTransferModalVisible] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);



    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyPress);
        } else {
            document.removeEventListener('keydown', handleKeyPress);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [isOpen]);

    // Toggle dial pad visibility
    const toggleDialPad = () => {
        setIsOpen(!isOpen);
    };

    const handleCall = () => {
        console.log(inputValue);
        setDialstatus("calling");
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            handleCall();
        }
    };



    const showTransferModal = () => {
        setTransferModalVisible(prevTransfer => !prevTransfer);
    };


    const handleTransferToggle = () => {
        showTransferModal();
    };


    const handleMuteToggle = () => setMute(prevMute => !prevMute);
    const handleHoldToggle = () => setHold(prevHold => !prevHold);
    // const handleTransferToggle = () => setTransfer(prevTransfer => !prevTransfer);
    const handleNotesToggle = () => setNotes(prevNotes => !prevNotes);

    const selectcontactfun = (value) => {
        setTransferModalVisible(false);
        setSelectedContact(value)
        console.log(value)


    };

    const hangup = () => {
        // setTimeout(() => {
        setDialstatus("");
        //functions
        setMute(false);
        setHold(false);
        setNotes(false);
        setTransferModalVisible(false);
        setSelectedContact("");
        // }, 1000);
    }

    //(value) => setSelectedContact(value)

    return (
        <div>
            {/* Floating Button */}
            <div className="Dialpad_floating-button" onClick={toggleDialPad}>
                <MdOutlineCall />
            </div>

            {/* Dialpad */}
            <div className={`Dialpad_container ${isOpen ? 'open' : ''}`}>
                <div className='Dialpad_container_1'>
                    <p className='Dialpad_avaliable'> <GoDotFill className='dialpad_avaliable_icon' />Avaliable</p>
                    <button className='Dailpad_close_btn' onClick={toggleDialPad}><IoMdClose /></button>
                </div>
                {dialstatus == "" ? (
                    <>
                        <div className='Dialpad_container_2'>
                            <input
                                type="tel"
                                className="dialpad-input"
                                placeholder="e.g. 7010635230"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}

                            />
                        </div>
                        <div className='Dialpad_container_3'>
                            <div className="dialpad-flex">
                                {['1', '2', '3'].map((num) => (
                                    <button key={num} className="dialpad-key" onClick={() => { setInputValue((prevValue) => prevValue + num) }}>
                                        {num}
                                    </button>
                                ))}
                            </div>
                            <div className="dialpad-flex">
                                {['4', '5', '6'].map((num) => (
                                    <button key={num} className="dialpad-key" onClick={() => { setInputValue((prevValue) => prevValue + num) }}>
                                        {num}
                                    </button>
                                ))}
                            </div>
                            <div className="dialpad-flex">
                                {['7', '8', '9'].map((num) => (
                                    <button key={num} className="dialpad-key" onClick={() => { setInputValue((prevValue) => prevValue + num) }}>
                                        {num}
                                    </button>
                                ))}
                            </div>
                            <div className="dialpad-flex">
                                {['*', '0', '#'].map((num) => (
                                    <button key={num} className="dialpad-key" onClick={() => { setInputValue((prevValue) => prevValue + num) }}>
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className='Dialpad_container_4'>
                            <button className="dialpad-dummy-btn"></button>
                            <button className="dialpad_call_btn" onClick={handleCall}>
                                <MdOutlineCall className='dialpad_call_btn_icon' />
                            </button>

                            {inputValue ? (
                                <button className="clear-button" onClick={() => { setInputValue('') }}>
                                    <RiArrowLeftSLine style={{ fontSize: '24px' }} />
                                </button>
                            ) : (<button className="dialpad-dummy-btn"></button>)}
                        </div>
                    </>
                ) : dialstatus == "calling" ? (
                    <div className='Dialpad_calling_containers'>
                        <div className='Dialpad_calling_container_1'>
                            {selectedContact == "Allan" ? (
                                <div className='Dialpad_calling_transfer_container'>
                                    <div className='Dialpad_calling_transfer_call_details'>

                                        <FaCircleUser className='Dialpad_calling_transfer_user_icon' />
                                        <div className='Dailpad_calling_transfer_caller_status'>
                                            <p style={{ color: 'white', fontSize: '14px' }}>Vicky</p>
                                            <Tag color="#ff9834" style={{ fontSize: '10px' }}>
                                                ON HOLD
                                            </Tag>

                                        </div>

                                    </div>

                                    <div className='Dialpad_calling_transfer_call_details' style={{ marginTop: '10px' }}>

                                        <FaCircleUser className='Dialpad_calling_transfer_user_icon' />
                                        <div className='Dailpad_calling_transfer_caller_status'>
                                            <p style={{ color: 'white', fontSize: '14px' }}>Jayam</p>
                                            <Tag color="#00b557" style={{ fontSize: '10px' }}>
                                                00:20
                                            </Tag>

                                        </div>
                                        <MdOutlineCallEnd style={{ color: 'red', fontSize: '30px', cursor: 'pointer' }} />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <FaCircleUser className='Dialpad_calling_caller_icon' />
                                    <p className='Dialpad_calling_caller_name'>Allan christopher</p>
                                    <p className='Dialpad_calling_caller_number'>+91 7010635230</p>
                                    <p className='Dialpad_calling_caller_mailid'>allanchristopher2516@gmail.com</p>
                                    <p className='Dialpad_calling_caller_seconds'>00:10</p>
                                </>
                            )}

                        </div>
                        <div className='Dialpad_calling_container_2'>
                            <div className='Dialpad_calling_contollers_1'>
                                <Tooltip title="Mute">
                                    <button className={`Dailpad_calling_fun_btn ${Mute ? 'Dailpad_calling_fun_btn_active' : ''}`} onClick={handleMuteToggle}>
                                        <AiOutlineAudioMuted className='Dailpad_calling_fun_btn_icon' />
                                        Mute
                                    </button>
                                </Tooltip>
                                <Tooltip title="Hold">
                                    <button className={`Dailpad_calling_fun_btn ${Hold ? 'Dailpad_calling_fun_btn_active' : ''}`} onClick={handleHoldToggle}>
                                        <MdOutlinePhonePaused className='Dailpad_calling_fun_btn_icon' />
                                        Hold
                                    </button>
                                </Tooltip>
                                <Tooltip title="Transfer">
                                    <button className={`Dailpad_calling_fun_btn ${transferModalVisible ? 'Dailpad_calling_fun_btn_active' : ''}`} onClick={handleTransferToggle}>
                                        <MdOutlinePhoneForwarded className='Dailpad_calling_fun_btn_icon' />
                                        Transfer
                                    </button>
                                </Tooltip>

                            </div>
                            <div className='Dialpad_calling_contollers_2'>
                                <Tooltip title="notes">
                                    <button className={`Dailpad_calling_fun_btn ${Notes ? 'Dailpad_calling_fun_btn_active' : ''}`} onClick={handleNotesToggle}>
                                        <TbNotes className='Dailpad_calling_fun_btn_icon' />
                                        notes
                                    </button>
                                </Tooltip>

                                <Tooltip title="Keypad">
                                    <button className='Dailpad_calling_fun_btn'>
                                        <MdDialpad className='Dailpad_calling_fun_btn_icon' />
                                        Keypad
                                    </button>
                                </Tooltip>

                                <Tooltip title="Merge">
                                    <button className={`Dailpad_calling_fun_btn ${Transfer ? 'Dailpad_calling_fun_btn_active' : ''}`} onClick={handleTransferToggle}>
                                        <MdMerge className='Dailpad_calling_fun_btn_icon' />
                                        Merge
                                    </button>
                                </Tooltip>

                            </div>
                        </div>
                        <div className='Dialpad_calling_container_3'>
                            <button className='Dialpad_calling_hangup_btn' onClick={hangup}><MdOutlineCallEnd className='Dialpad_calling_hangup_btn_icon' />END {selectedContact ? '& TRANSFER' : ''}</button>
                        </div>
                        <div className={`Dialpad_calling_transfer_model ${transferModalVisible ? 'Dialpad_calling_transfer_model_visible' : ''}`}>
                            <p className='Dialpad_calling_transfer_heading'>TRANSFER TO</p>
                            <Select
                                showSearch
                                style={{ width: '180px' }}
                                placeholder="Enter agent name/extension"
                                size="small"
                                value={selectedContact}
                                onChange={selectcontactfun}
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().includes(input.toLowerCase())
                                }
                                notFoundContent="No agent found"
                                className='Dialpad_calling_transfer_name_select'

                            >
                                <Select.Option value="Allan">Allan</Select.Option>
                                <Select.Option value="Vicky">Vicky</Select.Option>
                                <Select.Option value="Jayam">Jayam</Select.Option>
                            </Select>
                        </div>
                    </div>
                ) : (
                    <></>)}



            </div>


        </div>
    );
}

export default Dialpad;
