const columns = [
    { title: "Username", key: "username", width: "100px",fixed: "left" },
    { title: "Department", key: "department", width: "130px", fixed: "left"},

    {
      title: "Role",
      key: "role",
      width: "80px",
    },
    { title: "Call Date", key: "callDate", width: "150px" },
    {
      title: "Disposition",
      key: "disposition",
      width: "170px",
      // fixed: "right",
      render: (value) => {
        if (
          value === "Answered" ||
          value === "answered" ||
          value === "Answer" ||
          value === "answer"
        ) {
          return (
            <div className="table-answer-tag">
              <p>{value}</p>
            </div>
          );
        } else if (
          value === "No Answer" ||
          value === "no answer" ||
          value === "NoAnswer" ||
          value === "noanswer"
        ) {
          return (
            <span className="table-noanswer-tag">
              <p>{value}</p>
            </span>
          );
        } else if (
          value === "DTMF" ||
          value === "dtmf" ||
          value === "Dtmf" ||
          value === "Dtmf"
        ) {
          return (
            <span className="table-dtmf-tag">
              <p>{value}</p>
            </span>
          );
        }
        return null;
      },
    },
    { title: "Name", key: "name", width: "90px" },
    { title: "Source", key: "source", width: "120px" },
    { title: "Destination", key: "destination", width: "100px" },
    { title: "Who Hangup", key: "who_hangup", width: "100px" },
    { title: "Duration", key: "duration", width: "100px" },
    { title: "Call Type", key: "call_type", width: "100px" },
    { title: "Call Status", key: "call_status", width: "100px" },
    { title: "Call Recording", key: "call_recording", width: "100px" },
    { title: "Call Notes", key: "call_notes", width: "100px",fixed: "right" },
    {
      title: "Actions",
      key: "actions",
      render: () => <button>Action</button>,
      width: "110px",
      fixed: "right",
    },
  ];

  const dataSource = Array.from({ length: 150 }, (_, i) => ({
    s_no:"0",
    username: "John Doe",
    department: "Department 01",
    role: "Role 01",
    callDate: "26-04-2025 15:46",
    disposition: ["Answered", "No Answer", "DTMF"][i % 3],
    name: "John Doe",
    source:"9999-999-999",
    destination:"N/A",
    who_hangup:"john doe",
    duration:"00:00:00",
    call_type:"Inbound",
    call_status:"Completed",
    call_recording:"N/A",
    call_notes:"N/A",
    call_tags:"N/A",
    call_purpose:"N/A",
    call_direction:"Inbound",
    
  }));


  <Table columns={columns} dataSource={dataSource} />