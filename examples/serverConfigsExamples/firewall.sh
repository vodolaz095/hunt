#!/bin/bash

#Official script to set up firewall properly with Hunt.js
#(c) Ostroumov Anatolij
# https://github.com/vodolaz095/hunt


#drop all rules
iptables -F

#basic anti ddos
iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP
iptables -A INPUT -p tcp ! --syn -m state --state NEW -j DROP
iptables -A INPUT -p tcp --tcp-flags ALL ALL -j DROP

#accept established connections
iptables -A INPUT -p ALL -m state --state ESTABLISHED,RELATED  -j ACCEPT

#to access localhost
iptables -A INPUT -i lo -j ACCEPT

#open for ssh and http(s) servers
iptables -A INPUT -p tcp -m tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp -m tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp -m tcp --dport 443 -j ACCEPT

#allow sending anything
iptables -P OUTPUT ACCEPT

#do no accept other incoming transmissions
iptables -P INPUT DROP
