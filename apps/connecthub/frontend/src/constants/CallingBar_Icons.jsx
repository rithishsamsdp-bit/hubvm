import React from "react";
import ActiveAddAgent from "../assets/CallingBar_Icons/active_addagent.svg?react";
import ActiveDialpad from "../assets/CallingBar_Icons/active_dialpad.svg?react";
import ActiveMute from "../assets/CallingBar_Icons/active_mute.svg?react";
import ActivePause from "../assets/CallingBar_Icons/active_pause.svg?react";
import ActiveRecord from "../assets/CallingBar_Icons/active_record.svg?react";
import ActiveTransfer from "../assets/CallingBar_Icons/active_transfer.svg?react";
import AddAgent from "../assets/CallingBar_Icons/addagent.svg?react";
import Dialpad from "../assets/CallingBar_Icons/dialpad.svg?react";
import Mute from "../assets/CallingBar_Icons/mute.svg?react";
import Pause from "../assets/CallingBar_Icons/pause.svg?react";
import Record from "../assets/CallingBar_Icons/record.svg?react";
import Transfer from "../assets/CallingBar_Icons/transfer.svg?react";
import Whatsapp from "../assets/CallingBar_Icons/whatsapp.svg?react";
import Conference from "../assets/CallingBar_Icons/conference.svg?react";
import End from "../assets/CallingBar_Icons/end.svg?react";
import Close from "../assets/close.svg?react";
import Call from "../assets/call.svg?react";
import ContactBook from "../assets/contactbook.svg?react";



const icons = {
  contactBook: ContactBook,
  active_addagent: ActiveAddAgent,
  active_dialpad: ActiveDialpad,
  active_mute: ActiveMute,
  active_pause: ActivePause,
  active_record: ActiveRecord,
  active_transfer: ActiveTransfer,
  addagent: AddAgent,
  dialpad: Dialpad,
  mute: Mute,
  pause: Pause,
  record: Record,
  transfer: Transfer,
  whatsapp: Whatsapp,
  conference: Conference,
  end: End,
  close:Close,
  call:Call
};

const Icon = ({
  name,
  size = 24,
  color = "currentColor",
  className = "",
  ...props
}) => {
  const SvgIcon = icons[name];
  if (!SvgIcon) {
    console.warn(`Icon "${name}" not found`);
    return null; 
  }

  return (
    <SvgIcon
      width={size}
      height={size}
      fill={color} 
      className={className}
      role="img" 
      aria-label={`${name} icon`} 
      {...props}
    />
  );
};

export default Icon; 