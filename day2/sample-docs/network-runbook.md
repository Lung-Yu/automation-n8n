# Network Runbook

> 從 `assets/lab-b2-1-rag-index-workflow.json` 的 `Load SOP Documents` Code 節點還原為可讀 markdown（2026-08-09）。這是 Lab B2 RAG 索引實際使用的知識庫來源，內容與 workflow 完全一致。

## Chapter 1: Daily Check

Morning check ping core devices. BGP neighbors Established. CPU below 70. No errored interfaces. Check SNMP traps overnight. Verify NTP sync on all devices.

## Chapter 2: BGP Issues

BGP down internet connectivity degraded. BGP High severity notify L2 immediately. show bgp summary Idle Active. TCP 179 blocked. DO NOT clear BGP session without L2 approval. Check peer IP reachability, MD5 auth mismatch, AS number.

## Chapter 2: OSPF Issues

OSPF neighbor down routing instability. show ip ospf neighbor. Check hello interval mismatch, area mismatch, MTU mismatch. OSPF DR/BDR election storm. Dead interval 40s default. Verify loopback reachability.

## Chapter 3: Maintenance

Pre-maintenance checklist change approved maintenance window rollback plan. Interface bounce shutdown 10 seconds. Never restart both core switches simultaneously. Notify NOC before maintenance. Take config backup. Test rollback path.

## Chapter 4: Interface Errors

CRC errors physical layer problem check cable SFP. Input errors duplex mismatch. Output drops QoS congestion. show interface counters errors. High error rate >100 pps escalate. Replace SFP if persistent errors. Check fiber connector cleanliness.

## Chapter 4: Packet Loss

Packet loss symptoms latency spike application timeout. ping continuous test. traceroute identify hop. QoS policy misconfiguration drops high priority. Buffer exhaustion high utilization >85%. MTU black hole path MTU discovery.

## Chapter 5: VLAN Issues

VLAN mismatch trunk port access port. show vlan brief show interface trunk. Native VLAN mismatch CDP syslog warning. STP topology change VLAN convergence. Verify VLAN allowed on trunk. Check 802.1Q tagging end-to-end.

## Chapter 5: LACP Link Aggregation

LACP port-channel down member port failure. show etherchannel summary. Min-links threshold not met. LACP PDU timeout partner system mismatch. Load balancing algorithm asymmetric traffic. Verify speed duplex match on all members.

## Chapter 2: Bandwidth

Bandwidth congestion slow network packet loss high utilization. Over 80% congestion risk. CRC errors physical layer problem. Top talkers netflow analysis. QoS marking reclassification.

## Chapter 6: DNS Issues

DNS resolution failure application connectivity. nslookup dig test. DNS server unreachable check UDP 53. Stale cache TTL issue flush resolver. DNSSEC validation failure. Split-DNS internal external zone mismatch.

## Chapter 6: Firewall ACL

Connectivity blocked ACL deny log. show access-list hit count. ICMP blocked troubleshooting impact. Stateful firewall asymmetric routing drops. Implicit deny at end of ACL. Temporary permit for troubleshooting requires change ticket.
