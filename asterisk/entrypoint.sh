#!/bin/bash
set -e

sed -i "s/DIDWW_USERNAME/${DIDWW_SIP_USERNAME}/g" /etc/asterisk/pjsip.conf
sed -i "s/DIDWW_PASSWORD/${DIDWW_SIP_PASSWORD}/g" /etc/asterisk/pjsip.conf
sed -i "s/DIDWW_SIP_HOST/${DIDWW_SIP_HOST}/g" /etc/asterisk/pjsip.conf
sed -i "s/ASTERISK_ARI_PASSWORD/${ASTERISK_ARI_PASSWORD}/g" /etc/asterisk/ari.conf

exec asterisk -fvvv
