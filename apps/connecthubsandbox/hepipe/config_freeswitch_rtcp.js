var config = {
  hep_config: {
    debug: true,
    HEP_SERVER: '13.204.0.155',
    HEP_PORT: 9060
  },
  esl_config: {
    debug: true,
    ESL_SERVER: '13.126.50.209',
    ESL_PORT: 8021,
    ESL_PASS: 'Pulse#$2024',
    HEP_PASS: 'freeswitchESL',
    HEP_ID: 2222,
    report_call_events: true,
    report_rtcp_events: true,
    report_qos_events: true,
    report_custom_events: true
  }
};

module.exports = config;
