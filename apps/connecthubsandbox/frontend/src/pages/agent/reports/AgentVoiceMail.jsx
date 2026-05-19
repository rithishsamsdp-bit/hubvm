import { useEffect, useState } from "react";
import "./styles/AgentVoiceMail.css";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Table,
    DateTimeRangePicker,
    Input,
} from "../../../components/Index.jsx";
import { useVoiceMail } from "../../../store/agent/reports/useVoiceMail";
import { useAuthStore } from "../../../store/useAuthStore.js";
import Icon from "../../../constants/Icon.jsx";

const AgentVoiceMail = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);

    const [page, setPage] = useState(parseInt(params.get("page")) || 1);
    const [pageSize, setPageSize] = useState(parseInt(params.get("per_page")) || 10);
    const [offset, setOffset] = useState((page - 1) * pageSize || 0);
    const [searchString, setSearchString] = useState("");
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());


    const {
        getVoiceMail,
        voiceMailData,
        voiceMailCount,
        voiceMailLoading,
    } = useVoiceMail();

    const { authRole } = useAuthStore();

    const formatDate = (date, isEndDate = false) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const time = isEndDate ? "23:59:59" : "00:00:00";
        return `${year}-${month}-${day} ${time}`;
    };

    useEffect(() => {
        if (authRole === "TL") {
            navigate(`/tl-cdrReport?page=${page}&per_page=${pageSize}`);
        } else {
            navigate(`/agent-reports/agent-voicemail?page=${page}&per_page=${pageSize}`);
        }
        setOffset((page - 1) * pageSize);
    }, [page, pageSize, navigate]);

    useEffect(() => {
        getVoiceMail(
            pageSize,
            offset,
            searchString,
            formatDate(startDate),
            formatDate(endDate, true)
        );
    }, [
        pageSize,
        offset,
        searchString,
        startDate,
        endDate,
        getVoiceMail,
    ]);

    const handleClearFilters = () => {
        setSearchString("");
        setStartDate(new Date());
        setEndDate(new Date());
    };

    const handleDateChange = ({ start, end }) => {
        setStartDate(start);
        setEndDate(end);
    };

    const columns = [
        {
            title: "S.no",
            key: "s_no",
            width: 50,
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        },
        { title: "Number", key: "c_customerPhoneno" },
        { title: "Date", key: "c_callDateTime" },
        {
            title: "Recording",
            key: "c_recUrl",
            width: 250,
            Cell: (row) => {
                if (!row.c_recUrl) return <span>No Recording</span>;
                return (
                    <audio
                        controls
                        preload="none"
                        style={{ width: "250px" }}
                    >
                        <source src={row.c_recUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                );
            },
        },

    ];

    return (
        <div className="agent_voice_mail_report">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">Voice Mail Report</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            className="navbar_1_breadcrumb_item"
                            onClick={() => { navigate("/agent-dashboard") }}
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item" onClick={() => { navigate("/agent-reports") }}>
                            Reports
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">
                            Voice Mail Report
                        </span>
                    </span>
                </div>
            </div>
            <div className="agent_voice_mail_report_container">
                <div className="agent_voice_mail_report_filter_container">

                    <Input
                        type="text"
                        placeholder="Search number"
                        value={searchString}
                        onChange={(e) => setSearchString(e.target.value)}
                        width="300px"
                        suffixIcon="search"
                        suffixIconColor="#334155"
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
                        className="agent_voice_mail_report_filter_clear_button"
                        onClick={handleClearFilters}
                    >
                        Clear all
                    </button>
                </div>

                <Table
                    columns={columns}
                    data={voiceMailData}
                    loading={voiceMailLoading}
                    totaldata={voiceMailCount}
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
                        }, 0);
                    }}
                />
            </div>
        </div>
    );
};

export default AgentVoiceMail;


