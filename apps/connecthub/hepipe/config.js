var config = {
  hep_config: {
    debug:      true,
    HEP_SERVER: '10.0.4.171' ,
    HEP_PORT:   9060
  },
  esl_config: {
    debug:                true,
    ESL_SERVER:           process.env.ESL_SERVER,
    ESL_PORT:             8021,
    ESL_PASS:             'Pulse#$2024',
    HEP_PASS:             'freeswitchESL',
    HEP_ID:               parseInt(process.env.HEP_ID),
    report_call_events:   true,
    report_rtcp_events:   true,
    report_qos_events:    true,
    report_custom_events: true
  }
};

module.exports = config;