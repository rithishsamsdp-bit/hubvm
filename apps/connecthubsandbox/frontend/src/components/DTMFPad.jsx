import React, { useState } from "react";
import { Button, Input, Modal } from "./Index.jsx";
import "./styles/DTMFPad.css";
import { useAuthStore } from "../store/useAuthStore.js";
import { callStore } from "../store/useCallStore.js";
import Icon from "../constants/Icon.jsx";


const DTMFPad = ({ onSend: externalOnSend, onClose }) => {
  const authUser = useAuthStore((state) => state.authUser);
  const serviceRegion = authUser?.a_accountServiceRegion;

  const isInternational = serviceRegion === "International";

  const [digits, setDigits] = useState("");

  const [generalInput, setGeneralInput] = useState("");
  const [specialZInput, setSpecialZInput] = useState("");
  const [directInput, setDirectInput] = useState("");

  const { sendDTMF, activeCalls } = callStore();

  const currentCall = activeCalls?.[0];
  const callId = currentCall?.id;

  const handleDTMFSend = async (digitOrDigits) => {
    console.log("handleDTMFSend called with:", digitOrDigits);
    if (externalOnSend) {
      await externalOnSend(digitOrDigits);
    } else {
      if (!digitOrDigits) return;
      const digits = typeof digitOrDigits === 'string' ? digitOrDigits : String(digitOrDigits);

      for (const digit of digits) {
        await sendDTMF(digit, callId);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  };

  const dialButtons = [
    ["1", ""],
    ["2", "ABC"],
    ["3", "DEF"],
    ["4", "GHI"],
    ["5", "JKL"],
    ["6", "MNO"],
    ["7", "PQRS"],
    ["8", "TUV"],
    ["9", "WXYZ"],
    ["*", ""],
    ["0", "+"],
    ["#", ""],
  ];

  const handleButtonClick = (digit) => {
    setDigits((prev) => prev + digit);
    handleDTMFSend(digit);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (/^[0-9*#]*$/.test(val)) {
      setDigits(val);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && digits) {
      handleDTMFSend(digits);
      setDigits("");
    }
  };

  const handleSend = () => {
    if (digits) {
      handleDTMFSend(digits);
      setDigits("");
    }
  };

  const sendGeneral = () => {
    if (!generalInput || !handleDTMFSend) return;

    const arr = generalInput.split('');
    arr.forEach(char => {
      if (/[0-9]/.test(char)) {
        handleDTMFSend(char);
      } else if (char === '*') {
        handleDTMFSend('*');
      } else if (char === '#') {
        handleDTMFSend('#');
      } else {
        const lower = char.toLowerCase();
        const encodings = {
          'a': ['*', '2', '1'], 'b': ['*', '2', '2'], 'c': ['*', '2', '3'],
          'd': ['*', '3', '1'], 'e': ['*', '3', '2'], 'f': ['*', '3', '3'],
          'g': ['*', '4', '1'], 'h': ['*', '4', '2'], 'i': ['*', '4', '3'],
          'j': ['*', '5', '1'], 'k': ['*', '5', '2'], 'l': ['*', '5', '3'],
          'm': ['*', '6', '1'], 'n': ['*', '6', '2'], 'o': ['*', '6', '3'],
          'p': ['*', '7', '1'], 'q': ['*', '7', '2'], 'r': ['*', '7', '3'],
          's': ['*', '7', '4'], 't': ['*', '8', '1'], 'u': ['*', '8', '2'],
          'v': ['*', '8', '3'], 'w': ['*', '9', '1'], 'x': ['*', '9', '2'],
          'y': ['*', '9', '3'], 'z': ['*', '9', '4']
        };
        if (encodings[lower]) {
          encodings[lower].forEach(tone => handleDTMFSend(tone));
        }
      }
    });
    setGeneralInput('');
  };

  const sendSpecialZ = () => {
    if (!specialZInput || !handleDTMFSend) return;

    const arr = specialZInput.split('');
    arr.forEach(char => {
      if (/[0-9]/.test(char)) {
        handleDTMFSend(char);
      } else if (char === '*') {
        handleDTMFSend('*');
      } else if (char === '#') {
        handleDTMFSend('#');
      } else {
        const lower = char.toLowerCase();
        const encodings = {
          'a': ['*', '2', '1'], 'b': ['*', '2', '2'], 'c': ['*', '2', '3'],
          'd': ['*', '3', '1'], 'e': ['*', '3', '2'], 'f': ['*', '3', '3'],
          'g': ['*', '4', '1'], 'h': ['*', '4', '2'], 'i': ['*', '4', '3'],
          'j': ['*', '5', '1'], 'k': ['*', '5', '2'], 'l': ['*', '5', '3'],
          'm': ['*', '6', '1'], 'n': ['*', '6', '2'], 'o': ['*', '6', '3'],
          'p': ['*', '7', '1'], 'q': ['*', '1', '1'], 'r': ['*', '7', '2'],
          's': ['*', '7', '3'], 't': ['*', '8', '1'], 'u': ['*', '8', '2'],
          'v': ['*', '8', '3'], 'w': ['*', '9', '1'], 'x': ['*', '9', '2'],
          'y': ['*', '9', '3'], 'z': ['*', '1', '2']
        };
        if (encodings[lower]) {
          encodings[lower].forEach(tone => handleDTMFSend(tone));
        }
      }
    });
    setSpecialZInput('');
  };

  const sendDirect = () => {
    if (!directInput || !handleDTMFSend) return;

    const directMap = {
      '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
      '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      '*': '*', '#': '#',
      'a': '2', 'b': '2', 'c': '2', 'A': '2', 'B': '2', 'C': '2',
      'd': '3', 'e': '3', 'f': '3', 'D': '3', 'E': '3', 'F': '3',
      'g': '4', 'h': '4', 'i': '4', 'G': '4', 'H': '4', 'I': '4',
      'j': '5', 'k': '5', 'l': '5', 'J': '5', 'K': '5', 'L': '5',
      'm': '6', 'n': '6', 'o': '6', 'M': '6', 'N': '6', 'O': '6',
      'p': '7', 'q': '7', 'r': '7', 's': '7', 'P': '7', 'Q': '7', 'R': '7', 'S': '7',
      't': '8', 'u': '8', 'v': '8', 'T': '8', 'U': '8', 'V': '8',
      'w': '9', 'x': '9', 'y': '9', 'z': '9', 'W': '9', 'X': '9', 'Y': '9', 'Z': '9'
    };

    const arr = directInput.split('');
    arr.forEach(char => {
      const mappedKey = directMap[char];
      if (mappedKey) {
        handleDTMFSend(mappedKey);
      }
    });
    setDirectInput('');
  };

  if (isInternational) {
    return (
      <Modal
        open={true}
        onClose={onClose || (() => { })}
        width="400px"
        height="auto"
        closeOnOverlayClick={!!onClose}
        className={`dtmf-modal show`} 
      >
        <div className="keyboard-dtmf-modal">
          <div className="keyboard-dtmf-header">
            <h3 className="keyboard-dtmf-title">Keyboard DTMF</h3>
            <Button variant="empty" onClick={onClose}><Icon name="close" color="#0F172A" size="14" /></Button>
          </div>

          {/* Modal Content */}
          <div className="keyboard-dtmf-content">
            {/* Scenario 1: General Encoding */}
            <div className="dtmf-scenario-section">
              <div className="dtmf-scenario-title">General Encoding</div>
              <div className="dtmf-scenario-example">Ex: ABCD0015D (a → *21)</div>
              <div className="dtmf-input-container">
                <Input
                  type="text"
                  value={generalInput}
                  onChange={(e) => setGeneralInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && generalInput) {
                      sendGeneral();
                    }
                  }}
                  placeholder="Enter text..."
                  className="dtmf-input"
                />
                <Button
                  className="dtmf-send-button"
                  onClick={sendGeneral}
                  disabled={!generalInput}
                >
                  Send
                </Button>
              </div>
            </div>

            {/* Scenario 2: Special Z-Mapping */}
            <div className="dtmf-scenario-section">
              <div className="dtmf-scenario-title">Special Z-Mapping</div>
              <div className="dtmf-scenario-example">Ex: Z0012ABCD (q → *11, z → *12)</div>
              <div className="dtmf-input-container">
                <Input
                  type="text"
                  value={specialZInput}
                  onChange={(e) => setSpecialZInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && specialZInput) {
                      sendSpecialZ();
                    }
                  }}
                  placeholder="Enter text..."
                  className="dtmf-input"
                />
                <Button
                  className="dtmf-send-button"
                  onClick={sendSpecialZ}
                  disabled={!specialZInput}
                >
                  Send
                </Button>
              </div>
            </div>

            {/* Scenario 3: Direct Key Mapping */}
            <div className="dtmf-scenario-section">
              <div className="dtmf-scenario-title">Direct Key Mapping</div>
              <div className="dtmf-scenario-example">Ex: 123AD5 (a → 2, d → 3)</div>
              <div className="dtmf-input-container">
                <Input
                  type="text"
                  value={directInput}
                  onChange={(e) => setDirectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && directInput) {
                      sendDirect();
                    }
                  }}
                  placeholder="Enter text..."
                  className="dtmf-input"
                />
                <Button
                  className="dtmf-send-button"
                  onClick={sendDirect}
                  disabled={!directInput}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // Render Domestic UI (Dialpad only)
  return (
    <div className="dtmf-container">
      {/* Input + Send */}
      <div className="dtmf-input-container">
        <Input
          type="text"
          value={digits}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          placeholder="Enter DTMF digits"
          className="dtmf-input"
        />
        <Button
          className="dtmf-send-button"
          onClick={handleSend}
          disabled={!digits}
        >
          Send
        </Button>
      </div>

      {/* Keypad grid */}
      <div className="dtmf-grid">
        {dialButtons.map(([num, letters], idx) => (
          <button
            key={idx}
            className="dtmf-dial-button"
            onClick={() => handleButtonClick(num)}
          >
            <span className="dial-number">{num}</span>
            {letters && <span className="dial-letters">{letters}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DTMFPad;