# GuardDuty Findings Summary Report

**Detector ID:** d6cc1c49445a9c9b1042b1e145a3d631  
**Total Findings:** 362  
**Report Date:** July 23, 2025

## Executive Summary

This report summarizes GuardDuty security findings organized by severity level. Critical and high-severity findings require immediate attention.

## Findings by Severity

| Severity Level | Count | Percentage | Description |
|----------------|-------|------------|-------------|
| **Critical (9)** | 3 | 0.8% | Highest priority - immediate action required |
| **High (8)** | 141 | 39.0% | High priority - urgent investigation needed |
| **Medium-High (6)** | 3 | 0.8% | Medium-high priority |
| **Medium (5)** | 145 | 40.1% | Medium priority - scheduled review |
| **Low (2)** | 70 | 19.3% | Low priority - informational |

## Critical Findings (Severity 9)

| Finding Type | Resource | Count | Description |
|--------------|----------|-------|-------------|
| AttackSequence:IAM/CompromisedCredentials | IAMUser/john_doe | 1 | Potential credential compromise indicated by a sequence of actions |
| AttackSequence:S3/CompromisedData | S3 Buckets | 1 | Potential data compromise involving IAMUser/john_doe |
| AttackSequence:EKS/CompromisedCluster | eks-demo-cluster | 1 | Potential Kubernetes cluster compromise |

## High Severity Findings (Severity 8) - Top Categories

### Most Common High-Severity Finding Types:

1. **Malicious Activity (47 findings)**
   - Execution:Kubernetes/MaliciousFile - EICAR test files detected
   - Execution:Runtime/MaliciousFileExecuted
   - Impact:Runtime/CryptoMinerExecuted
   - CryptoCurrency:Runtime/BitcoinTool.B

2. **Command & Control Activity (24 findings)**
   - Backdoor:Runtime/C&CActivity.B
   - Backdoor:Runtime/C&CActivity.B!DNS
   - Trojan:Runtime/PhishingDomainRequest!DNS
   - Trojan:Runtime/DGADomainRequest.C!DNS

3. **Container Security (21 findings)**
   - PrivilegeEscalation:Runtime/CGroupsReleaseAgentModified
   - PrivilegeEscalation:Runtime/RuncContainerEscape
   - DefenseEvasion:Runtime/ProcessInjection.VirtualMemoryWrite
   - DefenseEvasion:Runtime/ProcessInjection.Proc

4. **Unauthorized Access (20 findings)**
   - UnauthorizedAccess:Runtime/MetadataDNSRebind
   - UnauthorizedAccess:EC2/TorRelay
   - UnauthorizedAccess:S3/TorIPCaller
   - UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration

5. **Kubernetes API Abuse (19 findings)**
   - DefenseEvasion:Kubernetes/TorIPCaller
   - CredentialAccess:Kubernetes/MaliciousIPCaller
   - Impact:Kubernetes/MaliciousIPCaller
   - Policy:Kubernetes/AnonymousAccessGranted

## Medium Severity Findings (Severity 5) - Top Categories

1. **Suspicious Network Activity (35 findings)**
   - Trojan:Runtime/BlackholeTraffic
   - Trojan:Runtime/DropPoint
   - UnauthorizedAccess:Runtime/TorClient

2. **Runtime Suspicious Behavior (28 findings)**
   - Execution:Runtime/NewBinaryExecuted
   - DefenseEvasion:Runtime/SuspiciousCommand
   - PrivilegeEscalation:Runtime/DockerSocketAccessed

3. **IAM Anomalous Behavior (23 findings)**
   - InitialAccess:IAMUser/AnomalousBehavior
   - Persistence:IAMUser/AnomalousBehavior
   - CredentialAccess:IAMUser/AnomalousBehavior

4. **Malicious IP Activity (20 findings)**
   - Recon:IAMUser/MaliciousIPCaller
   - Discovery:RDS/MaliciousIPCaller
   - UnauthorizedAccess:EC2/MaliciousIPCaller.Custom

5. **Container Security (19 findings)**
   - PrivilegeEscalation:Runtime/ContainerMountsHostDirectory
   - PrivilegeEscalation:Runtime/UserfaultfdUsage
   - DefenseEvasion:Runtime/ProcessInjection.Ptrace

## Low Severity Findings (Severity 2) - Top Categories

1. **Policy Violations (15 findings)**
   - Policy:IAMUser/RootCredentialUsage
   - Policy:S3/BucketBlockPublicAccessDisabled
   - Stealth:IAMUser/CloudTrailLoggingDisabled

2. **Suspicious Commands (25 findings)**
   - Discovery:Runtime/SuspiciousCommand
   - Persistence:Runtime/SuspiciousCommand
   - PrivilegeEscalation:Runtime/SuspiciousCommand

3. **Brute Force Attempts (8 findings)**
   - UnauthorizedAccess:EC2/RDPBruteForce
   - Impact:EC2/WinRMBruteForce

4. **Other Low-Risk Activities (22 findings)**
   - DefenseEvasion:Runtime/PtraceAntiDebugging
   - PrivilegeEscalation:Runtime/ElevationToRoot
   - Discovery:IAMUser/AnomalousBehavior

## Affected Resources Summary

| Resource Type | Total Findings | Critical/High | Medium | Low |
|---------------|----------------|---------------|---------|-----|
| **Instance** | 78 | 36 | 28 | 14 |
| **KubernetesCluster** | 62 | 24 | 26 | 12 |
| **EKSCluster** | 59 | 20 | 29 | 10 |
| **Container** | 55 | 23 | 22 | 10 |
| **ECSCluster** | 45 | 18 | 19 | 8 |
| **AccessKey** | 38 | 3 | 20 | 15 |
| **S3Bucket** | 13 | 8 | 4 | 1 |
| **RDSDBInstance** | 7 | 3 | 4 | 0 |
| **Lambda** | 4 | 3 | 1 | 0 |
| **AttackSequence** | 3 | 3 | 0 | 0 |
| **RDSLimitlessDB** | 6 | 3 | 3 | 0 |
| **S3Object** | 1 | 1 | 0 | 0 |

## Key Recommendations

### Immediate Actions Required:

1. **Investigate Critical Findings**
   - Review the attack sequences for IAMUser/john_doe
   - Check for data exfiltration from S3 buckets
   - Secure the compromised EKS cluster (eks-demo-cluster)

2. **Address High-Severity Threats**
   - Block communication with C&C servers and malicious IPs
   - Remove crypto miners and malicious files
   - Fix container escape vulnerabilities
   - Revoke compromised credentials

3. **Medium-Term Actions**
   - Review and restrict IAM permissions
   - Enable CloudTrail logging where disabled
   - Implement network segmentation for Tor traffic
   - Update container runtime security policies

4. **Security Hygiene**
   - Stop using root credentials
   - Re-enable S3 bucket public access blocks
   - Review Kubernetes RBAC policies
   - Implement runtime security monitoring

## Notable Patterns

1. **EICAR Test Files**: Multiple detections of EICAR test files suggest security testing or potential compromise
2. **Cryptocurrency Mining**: Significant crypto-mining activity detected across multiple resources
3. **Tor Network Usage**: High volume of Tor-related traffic indicating potential data exfiltration
4. **Container Escapes**: Multiple container escape attempts using various techniques
5. **Coordinated Attacks**: Attack sequences suggest organized compromise attempts

---
*Note: This report is based on GuardDuty findings as of July 23, 2025. Immediate investigation and remediation of critical and high-severity findings is strongly recommended.*