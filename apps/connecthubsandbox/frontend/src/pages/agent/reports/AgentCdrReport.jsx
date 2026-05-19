import { use, useEffect, useState } from "react";
import "./styles/AgentCdrReport.css";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Select,
    Table,
    DateTimeRangePicker,
    Input,
    Button,
    Modal
} from "../../../components/Index.jsx";
import { useCdrStore } from "../../../store/agent/reports/useCdrStore";
import Icon from "../../../constants/Icon.jsx";
import { formatSecsToHMS } from "../../../utils/helpers.js";

const AgentCdrReport = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);

    const [page, setPage] = useState(parseInt(params.get("page")) || 1);
    const [pageSize, setPageSize] = useState(
        parseInt(params.get("per_page")) || 10
    );
    const [offset, setOffset] = useState((page - 1) * pageSize || 0);
    const [searchString, setSearchString] = useState("");
    const [direction, setDirection] = useState("");
    const [campaign, setCampaign] = useState([]);
    const [disposition, setDisposition] = useState("");
    const [callMode, setCallMode] = useState("");
    const [agentDisposition, setAgentDisposition] = useState("");
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [sortField, setSortField] = useState("c_callDateTime");
    const [sortOrder, setSortOrder] = useState("DESC");
    const [specificFollowUpModal, setSpecificFollowUpModal] = useState("");
    const [selectedFollowUp, setSelectedFollowUp] = useState("");

    const {
        getCdrData,
        fetchCdrData,
        fetchCdrCount,
        isfetchLoading,
    } = useCdrStore();



    const formatDate = (date, isEndDate = false) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const time = isEndDate ? "23:59:59" : "00:00:00";
        return `${year}-${month}-${day} ${time}`;
    };

    useEffect(() => {

        navigate(`/agent-reports/agent-cdrReport?page=${page}&per_page=${pageSize}`);

        setOffset((page - 1) * pageSize);
    }, [page, pageSize, navigate]);

    useEffect(() => {
        getCdrData(
            pageSize,
            offset,
            sortField,
            sortOrder,
            searchString,
            campaign,
            disposition,
            callMode,
            agentDisposition,
            direction,
            formatDate(startDate),
            formatDate(endDate, true)
        );
    }, [
        pageSize,
        offset,
        sortField,
        sortOrder,
        searchString,
        campaign,
        disposition,
        callMode,
        agentDisposition,
        direction,
        startDate,
        endDate,
        getCdrData,
    ]);

    const handleClearFilters = () => {
        setSearchString("");
        setDirection("");
        setCampaign([]);
        setDisposition("");
        setCallMode("");
        setAgentDisposition("");
        setStartDate(new Date());
        setEndDate(new Date());
    };

    const handleDateChange = ({ start, end }) => {
        setStartDate(start);
        setEndDate(end);
    };

    const handleNotesModalCancel = () => {
        setSpecificFollowUpModal(false);
    };


    const columns = [
        {
            title: "S.no",
            key: "s_no",
            width: 50,
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
            fixed: "left",
        },
        { title: "AccountCode", key: "AccountCode", width: 100, fixed: "left" },
        { title: "CampaignName", key: "CampaignName" },
        { title: "Member Name", key: "MemberName" },
        { title: "Customer Phone Number", key: "CustomerPhoneNumber" },

        { title: "Call Date-Time", key: "CallDateTime", width: 100 },
        { title: "Call Direction", key: "CallDirection", width: 120 },
        {
            title: "Call Disposition",
            key: "CallDisposition",
            width: 170,
            Cell: (row) => {
                const value = row.CallDisposition.toLowerCase();
                if (value.includes("no")) {
                    return (
                        <span className="table-noanswer-tag">
                            <p>{row.CallDisposition}</p>
                        </span>
                    );
                } else if (value.includes("answered")) {
                    return (
                        <div className="table-answer-tag">
                            <p>{row.CallDisposition}</p>
                        </div>
                    );
                } else if (value.includes("busy")) {
                    return (
                        <span className="table-dtmf-tag">
                            <p>{row.CallDisposition}</p>
                        </span>
                    );
                } else if (value.includes("failed")) {
                    return (
                        <span className="table-failed-tag">
                            <p>{row.CallDisposition}</p>
                        </span>
                    );
                } else if (value.includes("dtmf")) {
                    return (
                        <span className="table-dtmf-tag">
                            <p>{row.CallDisposition}</p>
                        </span>
                    );
                } else if (value.includes("missed")) {
                    return (
                        <span className="table-missed-tag">
                            <p>{row.CallDisposition}</p>
                        </span>
                    );
                }
                return null;
            },
        },
        {
            title: "Call Duration", key: "CallDuration", width: 60,
            Cell: (row) => {
                return formatSecsToHMS(row.CallDuration)
            }
        },
        { title: "Call Mode", key: "CallMode", width: 80 },
        {
            title: "WrapUp Duration", key: "WrapUpDuration", width: 60,
            Cell: (row) => {
                return formatSecsToHMS(row.WrapUpDuration)
            }
        },
        { title: "Call Line Number", key: "CallLineNumber"},
        { title: "Member Extension Number", key: "MemberExtensionNumber" },
        { title: "Member PhoneNumber", key: "MemberPhoneNumber" },
        { title: "Member Extension Name", key: "MemberExtensionName" },
        { title: "Member Registered IP", key: "MemberRegisteredIP" },
        { title: "Call Disconnection End", key: "CallDisconnectionEnd" },
        {
            title: "Follow up", key: "FollowUpData", width: 100, fixed: "right",
            Cell: (row) => {
                return (
                    <div className="admin_callflow_list_action_conatiner">
                        <Button
                            type="button"
                            variant="primary"
                            onClick={() => {
                                setSelectedFollowUp(row.FollowUpData);
                                setSpecificFollowUpModal(true);
                            }}
                        >
                            Follow up
                        </Button>
                    </div>
                )

            }
        },
        {
            title: "Call Recording",
            key: "CallRecording",
            fixed: "right",
            width: 280,
            Cell: (row) => {
                if (!row.CallRecording) return <span>No Recording</span>;
                return (
                    <audio
                        controls
                        preload="none"
                        style={{ width: "280px" }}
                    >
                        <source src={row.CallRecording} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                );
            },
        },

    ];

    return (
        <div className="agent_cdr_report">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">Cdr Report</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            className="navbar_1_breadcrumb_item"
                            onClick={() => {
                                navigate("/agent-dashboard")
                            }}
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item" onClick={() => { navigate("/agent-reports") }}>
                            Reports
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">
                            Cdr Report
                        </span>
                    </span>
                </div>
            </div>
            <div className="agent_cdr_report_container">
                <div className="agent_cdr_report_filter_container">
                    <Input
                        type="text"
                        placeholder="Search by Campaign name, Source, Destination"
                        value={searchString}
                        onChange={(e) => setSearchString(e.target.value)}
                        width="300px"
                        suffixIcon="search"
                        suffixIconColor="#334155"
                    />
                    <Select
                        mode="single"
                        width="130px"
                        placeholder="Direction"
                        showSearch={false}
                        value={direction}
                        onChange={setDirection}
                        options={[
                            { label: "Outbound", value: "Outbound" },
                            { label: "Inbound", value: "Inbound" },
                        ]}
                    />
                    <Select
                        mode="single"
                        width="130px"
                        placeholder="Disposition"
                        showSearch={false}
                        value={disposition}
                        onChange={setDisposition}
                        options={[
                            { label: "Answered", value: "ANSWERED" },
                            { label: "No Answer", value: "NO ANSWER" },
                            { label: "Voice Mail", value: "VOICEMAIL" },
                        ]}
                    />
                    <Select
                        mode="single"
                        width="130px"
                        placeholder="Call Mode"
                        showSearch={false}
                        value={callMode}
                        onChange={setCallMode}
                        options={[
                            { label: "Browser", value: "BROWSER" },
                            { label: "Softphone", value: "SOFTPHONE" },
                        ]}
                    />
                    <DateTimeRangePicker
                        type="range"
                        showTime={false}
                        initialStart={startDate}
                        initialEnd={endDate}
                        onChange={handleDateChange}
                        format="YYYY-MM-DD"
                    />
                    <button
                        className="agent_cdr_report_filter_clear_button"
                        onClick={handleClearFilters}
                    >
                        Clear all
                    </button>

                </div>

                <Table
                    columns={columns}
                    data={fetchCdrData}
                    loading={isfetchLoading}
                    totaldata={fetchCdrCount}
                    page={page}
                    serverSide
                    pageSize={pageSize}
                    onPageChange={(pagevalues) => {
                        setTimeout(() => {
                            setPage(pagevalues.currentPage);
                            setPageSize(pagevalues.pageSize);
                            setOffset(
                                pagevalues.pageSize * pagevalues.currentPage -
                                pagevalues.pageSize
                            );
                            // setSortField(pagevalues.sortConfig.key);
                            // setSortOrder(pagevalues.sortConfig.direction);
                        }, 0);
                    }}
                />

                <Modal
                    open={specificFollowUpModal}
                    width="627px"
                    onClose={() => setSpecificFollowUpModal(false)}
                >
                    <div className="callback_remainder_modal_header_container">
                        <p className="callback_remainder_modal_header">Notes</p>
                        <Button variant="empty" onClick={handleNotesModalCancel}>
                            <Icon name="close" color="#0F172A" size={14} />
                        </Button>
                    </div>


                    <form className="callback_remainder_modal_form">
                        {selectedFollowUp && Object.keys(selectedFollowUp).length > 0 ? (
                            <div className="notes-container">
                                {Object.entries(selectedFollowUp).map(([key, value]) => (
                                    <div className="note-row" key={key}>
                                        <span className="note-key">{key}</span>
                                        {typeof value === "object" ? (
                                            <span className="note-value">
                                                start - {value.start} — end - {value.end}
                                            </span>
                                        ) : (
                                            <span className="note-value">{value || "-"}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-data">No data found</p>
                        )}
                    </form>



                </Modal>
            </div>
        </div>
    );
};

export default AgentCdrReport;
