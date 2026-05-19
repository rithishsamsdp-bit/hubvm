import { useState } from "react";
import "./styles/API_integration.css";
import { useNavigate } from "react-router-dom";
import Icon from "../../../constants/Icon.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";

const Reference = () => {
    const [selectedApi, setSelectedApi] = useState(null);
    const navigate = useNavigate();
    const { authRole } = useAuthStore();

    // API data structure
    const apiList = [
        {
            id: 1,
            name: "Authentication Token",
            method: "POST",
            endpoint: "https://connecthub.pulsework360.com/auth/token",
            description: "Generate authentication token for API access",
            requestHeaders: [
                { header: "Content-Type", value: "application/json", required: true }
            ],
            requestBodyParams: [
                { parameter: "accountcode", type: "string", required: true, description: "The unique account code identifier" },
                { parameter: "membername", type: "string", required: true, description: "The member's username" },
                { parameter: "memberpassword", type: "string", required: true, description: "The member's password" }
            ],
            exampleRequest: {
                url: "POST https://connecthub.pulsework360.com/auth/token",
                contentType: "application/json",
                body: {
                    accountcode: "PTPL",
                    membername: "Pulsetech",
                    memberpassword: "Pulse@123"
                }
            },
            successResponse: {
                statusCode: "201 OK",
                body: {
                    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    message: "Authorization Successful!"
                }
            },
            responseParams: [
                { parameter: "token", type: "string", description: "JWT access token for authentication" },
                { parameter: "message", type: "string", description: "message" }
            ],
            errorResponses: [
                {
                    statusCode: "401 Unauthorized",
                    description: "Invalid credentials provided",
                    example: {
                        errors: "Unauthorized",
                        message: "Invalid account code, username, or password"
                    }
                },
                {
                    statusCode: "400 Bad Request",
                    description: "Missing required parameters",
                    example: {
                        errors: "Bad Request",
                        message: "Missing required fields"
                    }
                },
                {
                    statusCode: "500 Internal Server Error",
                    description: "Server error occurred",
                    example: {
                        errors: "Internal Server Error",
                        message: "An unexpected error occurred"
                    }
                }
            ]
        },
        {
            id: 2,
            name: "Click-to-Call Service",
            method: "POST",
            endpoint: "https://connecthub.pulsework360.com/clicktocall/call/originate",
            description: "Initiates a call by connecting the originator to the recipient",
            requestHeaders: [
                { header: "Content-Type", value: "application/json", required: true },
                { header: "Authorization", value: "Bearer {token}", required: true }
            ],
            requestBodyParams: [
                { parameter: "From", type: "string", required: true, description: "The phone number or extension of the call originator (agent/user)" },
                { parameter: "To", type: "string", required: true, description: "The phone number of the recipient (customer) to be called" },
                { parameter: "Callerid", type: "string", required: true, description: "Type of call. Possible values: 'outbound', 'inbound'" },
                { parameter: "Custom", type: "object", required: false, description: "Custom data object for passing additional information (e.g., leadId, campaignId)" }
            ],
            exampleRequest: {
                url: "POST https://connecthub.pulsework360.com/clicktocall/call/originate",
                contentType: "application/json",
                body: {
                    From: "42028",
                    To: "6374375763",
                    Callerid: "",
                    Custom: {
                        leadId: "789"
                    }
                }
            },
            successResponse: {
                statusCode: "200 OK",
                body: {
                    status: "success",
                    message: "Click-to-call initiated successfully",
                    data: {
                        To: "8668124849",
                        From: "42030",
                        Callerid: "",
                        Custom: {}
                    },
                    call_uuid: "918c5476-f86c-45de-9024-6a620576e139",
                    response_time_ms: 398
                }
            },
            responseParams: [
                { parameter: "status", type: "string", description: "Status of the request" },
                { parameter: "message", type: "string", description: "Descriptive message about the operation" },
                { parameter: "data", type: "object", description: "Echo of the request parameters" },
                { parameter: "call_uuid", type: "string", description: "Unique identifier for the initiated call" },
                { parameter: "response_time_ms", type: "number", description: "Response time in milliseconds" }
            ],
            errorResponses: [
                {
                    statusCode: "401 Unauthorized",
                    description: "Invalid or expired authentication token",
                    example: {
                        error: "Unauthorized",
                        message: "Invalid or expired token"
                    }
                },
                {
                    statusCode: "400 Bad Request",
                    description: "Missing required parameters",
                    example: {
                        error: "Bad Request",
                        message: "Missing required fields"
                    }
                },
                {
                    statusCode: "500 Internal Server Error",
                    description: "Server error occurred",
                    example: {
                        error: "Internal Server Error",
                        message: "An unexpected error occurred"
                    }
                }
            ]
        }
    ];

    const handleApiClick = (api) => {
        setSelectedApi(api);
    };

    const handleBackToList = () => {
        setSelectedApi(null);
    };

    return (
        <div className="reference_page">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">API Integration</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            className="navbar_1_breadcrumb_item"
                            onClick={() => {
                                if (authRole === "TL") {
                                    navigate("/tl-dashboard");
                                } else if (authRole === "ADMIN") {
                                    navigate("/admin-dashboard");
                                }
                            }}
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span
                            className="navbar_1_breadcrumb_item"
                            onClick={() => navigate("/admin/integration")}
                        >
                            Integration
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">
                            API integration
                        </span>
                    </span>
                </div>
            </div>

            <div className="reference_container">
                {!selectedApi ? (
                    // API List View
                    <div className="api_list_container">
                        <div className="api_list_header">
                            <h2>Available APIs</h2>
                            <p>Click on an API to view its detailed reference</p>
                        </div>
                        <div className="api_list_items">
                            {apiList.map((api) => (
                                <div
                                    key={api.id}
                                    className="api_list_item"
                                    onClick={() => handleApiClick(api)}
                                >
                                    <div className="api_list_item_header">
                                        <span className={`api_method ${api.method.toLowerCase()}`}>
                                            {api.method}
                                        </span>
                                        <span className="api_name">{api.name}</span>
                                    </div>
                                    <div className="api_endpoint">{api.endpoint}</div>
                                    <div className="api_description">{api.description}</div>
                                    <Icon name="rightarrow" size={10} color="#ff5200" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    // API Detail View
                    <div className="api_detail_container">
                        <button className="back_button" onClick={handleBackToList}>
                            <Icon name="leftarrow" size={10} color="#ff5200" />
                            Back to API List
                        </button>

                        <div className="api_detail_header">
                            <h1>{selectedApi.name}</h1>
                            <div className="api_detail_endpoint">
                                <span className={`api_method ${selectedApi.method.toLowerCase()}`}>
                                    {selectedApi.method}
                                </span>
                                <span className="endpoint_url">{selectedApi.endpoint}</span>
                            </div>
                            <p className="api_detail_description">{selectedApi.description}</p>
                        </div>

                        {/* Request Headers */}
                        <div className="api_section">
                            <h2>Request Headers</h2>
                            <table className="api_table">
                                <thead>
                                    <tr>
                                        <th>Header</th>
                                        <th>Value</th>
                                        <th>Required</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedApi.requestHeaders.map((header, index) => (
                                        <tr key={index}>
                                            <td>{header.header}</td>
                                            <td>{header.value}</td>
                                            <td>{header.required ? "Yes" : "No"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Request Body Parameters */}
                        <div className="api_section">
                            <h2>Request Body Parameters</h2>
                            <table className="api_table">
                                <thead>
                                    <tr>
                                        <th>Parameter</th>
                                        <th>Type</th>
                                        <th>Required</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedApi.requestBodyParams.map((param, index) => (
                                        <tr key={index}>
                                            <td>{param.parameter}</td>
                                            <td>{param.type}</td>
                                            <td>{param.required ? "Yes" : "No"}</td>
                                            <td>{param.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Example Request */}
                        <div className="api_section">
                            <h2>Example Request</h2>
                            <div className="code_block">
                                <p className="code_label">Endpoint URL:</p>
                                <pre>{selectedApi.exampleRequest.url}</pre>

                                <p className="code_label">Content-Type:</p>
                                <pre>{selectedApi.exampleRequest.contentType}</pre>

                                <p className="code_label">Request Body:</p>
                                <pre>{JSON.stringify(selectedApi.exampleRequest.body, null, 2)}</pre>
                            </div>

                            <div className="curl_example">
                                <p className="code_label">cURL Example:</p>
                                    <pre>
                                    {`curl -k --location '${selectedApi.endpoint}' \\
                                    --header 'Content-Type: ${selectedApi.exampleRequest.contentType}' \\
                                    --data '${JSON.stringify(selectedApi.exampleRequest.body).replace(/\n/g, '')}'`}
                                    </pre>
                            </div>
                        </div>

                        {/* Response */}
                        <div className="api_section">
                            <h2>Response</h2>
                            <h3 className="subsection_title">Success Response</h3>
                            <div className="response_block">
                                <p className="status_code success">{selectedApi.successResponse.statusCode}</p>
                                <pre>{JSON.stringify(selectedApi.successResponse.body, null, 2)}</pre>
                            </div>

                            <h3 className="subsection_title">Response Parameters</h3>
                            <table className="api_table">
                                <thead>
                                    <tr>
                                        <th>Parameter</th>
                                        <th>Type</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedApi.responseParams.map((param, index) => (
                                        <tr key={index}>
                                            <td>{param.parameter}</td>
                                            <td>{param.type}</td>
                                            <td>{param.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Error Responses */}
                        <div className="api_section">
                            <h2>Error Responses</h2>
                            {selectedApi.errorResponses.map((error, index) => (
                                <div key={index} className="error_response_block">
                                    <p className="status_code error">{error.statusCode}</p>
                                    <p className="error_description"><strong>Description:</strong> {error.description}</p>
                                    <pre>{JSON.stringify(error.example, null, 2)}</pre>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reference;
