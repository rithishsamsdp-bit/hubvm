# Asterisk PJSIP Endpoint Configuration

## Browser Endpoint

```ini
[Browser](!)
type=endpoint
;transport=transport-wss
disallow=all
allow=alaw,ulaw,g729

; WebRTC NAT + RTP settings
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
direct_media=no

; WebRTC Encryption (Mandatory)
use_avpf=yes
media_encryption=dtls
dtls_ca_file=/etc/asterisk/keys/asterisk.pem
dtls_cert_file=/etc/asterisk/keys/asterisk.pem
dtls_verify=fingerprint
dtls_setup=actpass

; WebRTC ICE + RTCP-MUX
ice_support=yes
rtcp_mux=yes

; Other options
dtmf_mode=rfc4733
rtp_timeout=60
rtp_keepalive=20
```

### Configuration Details

#### Transport & Codecs
- **Transport**: WebSocket Secure (WSS)
- **Codecs**: alaw, ulaw, g729

#### WebRTC NAT & RTP Settings
- `rtp_symmetric=yes` - Enables symmetric RTP
- `force_rport=yes` - Forces RTP port rewriting
- `rewrite_contact=yes` - Rewrites Contact header
- `direct_media=no` - Disables direct media

#### WebRTC Encryption
- **Encryption**: DTLS (mandatory)
- **Certificate**: `/etc/asterisk/keys/asterisk.pem`
- **Verification**: Fingerprint-based
- **Setup**: actpass (active/passive)

#### WebRTC Features
- **ICE Support**: Enabled
- **RTCP-MUX**: Enabled

#### Other Options
- **DTMF Mode**: RFC 4733
- **RTP Timeout**: 60 seconds
- **RTP Keepalive**: 20 seconds

---

## Softphone Endpoint

```ini
[Softphone](!)
type=endpoint
rtp_symmetric=yes
context=guidehouse1
disallow=all
allow=alaw,ulaw,g729
direct_media=no
transport=transport-udp  ; (or your defined transport)
rewrite_contact=yes       ; helpful behind NAT
```

### Configuration Details

#### Transport & Codecs
- **Transport**: UDP
- **Codecs**: alaw, ulaw, g729
- **Context**: guidehouse1

#### NAT & RTP Settings
- `rtp_symmetric=yes` - Enables symmetric RTP
- `rewrite_contact=yes` - Helpful behind NAT
- `direct_media=no` - Disables direct media

---

## Summary

This configuration defines two PJSIP endpoints:

1. **Browser** - Configured for WebRTC with DTLS encryption, ICE support, and WebSocket Secure transport
2. **Softphone** - Configured for traditional SIP softphones using UDP transport with NAT traversal support

Both endpoints support the same codecs (alaw, ulaw, g729) and have symmetric RTP enabled for better NAT traversal.

