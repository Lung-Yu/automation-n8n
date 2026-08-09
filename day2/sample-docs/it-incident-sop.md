# IT SOP

> 從 `assets/lab-b2-1-rag-index-workflow.json` 的 `Load SOP Documents` Code 節點還原為可讀 markdown（2026-08-09）。這是 Lab B2 RAG 索引實際使用的知識庫來源，內容與 workflow 完全一致。

## Section 2: Severity Classification

Critical response SLA 15 minutes 4 hours. High 30 minutes 8 hours. Medium 2 hours 48 hours. Low 8 hours 5 days. CPU 95 Critical. Memory 90 High. Disk 85 Medium. BGP down Critical. OSPF instability High.

## Section 3: Incident Response

Critical incidents notify on-call manager via phone. High incidents notify team lead messaging. Check monitoring dashboards Grafana Zabbix. Create incident ticket immediately. Timeline documentation every 30 minutes.

## Section 3.3: Escalation

L1 to L2 escalate if not resolved 30 minutes. L2 to L3 Critical 2 hours escalate department head. L3 Vendor contact TAC case. Network vendor Cisco TAC 1-800-553-2447. Always have case number before escalating.

## Section 6: High CPU

High CPU use top htop identify process. Check expected batch job. Capture lsof strace. Check deployments. DO NOT kill process without understanding. Control plane CPU routing protocol vs data plane CPU forwarding.

## Section 6: Memory OOM

OOM dmesg grep OOM killer. Identify killed process restart. Memory leak gradual increase days. JVM heap misconfiguration. Network device memory OSPF large LSDB BGP full table 800MB.

## Section 7: SNMP Monitoring

SNMP v3 authPriv required no v1 v2c in production. OID ifOperStatus 1 up 2 down. Trap receiver redundant two servers. SNMP walk verify reachability. Community string rotation every 90 days. MIB compilation device-specific.

## Section 8: NTP Synchronization

NTP stratum 2 source GPS reference. show ntp status stratum offset. Offset >128ms alert. NTP authentication MD5. All devices sync to internal NTP hierarchy. Logs timestamp accuracy compliance requirement.
