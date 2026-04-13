FROM andrius/asterisk:20.18.2_debian-trixie

USER root

COPY config/pjsip.conf /etc/asterisk/pjsip.conf
COPY config/extensions.conf /etc/asterisk/extensions.conf
COPY config/ari.conf /etc/asterisk/ari.conf
COPY config/http.conf /etc/asterisk/http.conf
COPY config/modules.conf /etc/asterisk/modules.conf
COPY config/rtp.conf /etc/asterisk/rtp.conf
COPY --chmod=755 entrypoint.sh /entrypoint.sh

EXPOSE 5060/udp 8088 10000-20000/udp

ENTRYPOINT ["/entrypoint.sh"]
