#!/usr/bin/env node
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import AWS from 'aws-sdk';

// Configure AWS - it will use your .aws/credentials automatically
AWS.config.update({ 
  region: 'eu-west-2' 
});

// Initialize GuardDuty client
const guardduty = new AWS.GuardDuty();

// Detect if running in Claude's environment (no AWS creds)
const IN_CLAUDE_ENV = !process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_SECRET_ACCESS_KEY;

// Mock data for when AWS isn't available
const MOCK_FINDINGS = {
  finding_count: 2,
  findings: [
    {
      id: "sample-001",
      type: "UnauthorizedAccess:EC2/SSHBruteForce",
      severity: 8,
      title: "SSH brute force attack detected",
      resource: "EC2",
      time: new Date().toISOString()
    },
    {
      id: "sample-002", 
      type: "CryptoCurrency:EC2/BitcoinTool.B!DNS",
      severity: 6,
      title: "Cryptocurrency mining activity detected",
      resource: "EC2",
      time: new Date().toISOString()
    }
  ]
};

const MOCK_INVESTIGATION = {
  summary: {
    title: "SSH brute force attack detected",
    description: "Multiple failed SSH login attempts detected from suspicious IP address",
    severity: 8,
    confidence: 95,
    type: "UnauthorizedAccess:EC2/SSHBruteForce"
  },
  timeline: {
    firstSeen: new Date(Date.now() - 3600000).toISOString(),
    lastSeen: new Date().toISOString(),
    count: 127
  },
  resource: {
    type: "EC2",
    instanceId: "i-1234567890abcdef0",
    instanceType: "t2.micro",
    platform: "Linux",
    tags: { Name: "WebServer", Environment: "Production" }
  },
  threat: {
    actionType: "NETWORK_CONNECTION",
    attackerIP: "198.51.100.42",
    attackerCountry: "Unknown",
    attackerOrg: "Suspicious Networks Inc.",
    attackerISP: "BadISP",
    port: 22,
    protocol: "TCP"
  },
  recommendation: "This is an active finding that requires immediate attention."
};

// Tool implementations
async function listFindings({ detectorId, maxResults = 500 }) {
  try {
    let allFindingIds = [];
    let nextToken = null;
    
    // Paginate through all findings up to maxResults
    do {
      const params = {
        DetectorId: detectorId,
        MaxResults: Math.min(50, maxResults - allFindingIds.length), // AWS max is 50 per request
        FindingCriteria: {
          Criterion: {
            severity: {
              Gte: 0.1 // Include all severities (Low and above)
            }
          }
        }
      };
      
      if (nextToken) {
        params.NextToken = nextToken;
      }
      
      const response = await guardduty.listFindings(params).promise();
      
      if (response.FindingIds && response.FindingIds.length > 0) {
        allFindingIds = allFindingIds.concat(response.FindingIds);
      }
      
      nextToken = response.NextToken;
      
    } while (nextToken && allFindingIds.length < maxResults);
    
    if (allFindingIds.length === 0) {
      return JSON.stringify({
        message: 'No findings found',
        tip: `Generate sample findings with: aws guardduty create-sample-findings --detector-id ${detectorId}`
      }, null, 2);
    }
    
    // Get details for findings in batches (max 50 per request)
    const allFindings = [];
    for (let i = 0; i < allFindingIds.length; i += 50) {
      const batch = allFindingIds.slice(i, i + 50);
      const findings = await guardduty.getFindings({
        DetectorId: detectorId,
        FindingIds: batch
      }).promise();
      
      if (findings.Findings) {
        allFindings.push(...findings.Findings);
      }
    }
    
    // Format findings
    const formattedFindings = allFindings.map(f => ({
      id: f.Id,
      type: f.Type,
      severity: f.Severity,
      title: f.Title,
      resource: f.Resource?.ResourceType,
      time: f.UpdatedAt
    }));
    
    return JSON.stringify({
      finding_count: formattedFindings.length,
      findings: formattedFindings
    }, null, 2);
  } catch (error) {
    // If AWS call fails, try mock data
    console.error('AWS call failed, using mock data:', error.message);
    return JSON.stringify({
      message: "Using sample data (AWS call failed: " + error.message + ")",
      ...MOCK_FINDINGS
    }, null, 2);
  }
}

async function investigateFinding({ detectorId, findingId }) {
  try {
    const findings = await guardduty.getFindings({
      DetectorId: detectorId,
      FindingIds: [findingId]
    }).promise();
    
    if (!findings.Findings || findings.Findings.length === 0) {
      throw new Error(`Finding ${findingId} not found`);
    }
    
    const finding = findings.Findings[0];
    
    const investigation = {
      summary: {
        title: finding.Title,
        description: finding.Description,
        severity: finding.Severity,
        confidence: finding.Confidence,
        type: finding.Type
      },
      timeline: {
        firstSeen: finding.CreatedAt,
        lastSeen: finding.UpdatedAt,
        count: finding.Service?.Count
      },
      resource: {
        type: finding.Resource?.ResourceType,
        instanceId: finding.Resource?.InstanceDetails?.InstanceId,
        instanceType: finding.Resource?.InstanceDetails?.InstanceType,
        platform: finding.Resource?.InstanceDetails?.Platform,
        tags: finding.Resource?.InstanceDetails?.Tags
      },
      threat: {
        actionType: finding.Service?.Action?.ActionType,
        attackerIP: finding.Service?.Action?.NetworkConnectionAction?.RemoteIpDetails?.IpAddressV4,
        attackerCountry: finding.Service?.Action?.NetworkConnectionAction?.RemoteIpDetails?.Country?.CountryName,
        attackerOrg: finding.Service?.Action?.NetworkConnectionAction?.RemoteIpDetails?.Organization?.Org,
        attackerISP: finding.Service?.Action?.NetworkConnectionAction?.RemoteIpDetails?.Organization?.Isp,
        port: finding.Service?.Action?.NetworkConnectionAction?.LocalPortDetails?.Port,
        protocol: finding.Service?.Action?.NetworkConnectionAction?.Protocol
      },
      recommendation: finding.Service?.Archived === false ? 
        "This is an active finding that requires immediate attention." : 
        "This finding has been archived."
    };
    
    return JSON.stringify(investigation, null, 2);
  } catch (error) {
    // If AWS call fails, try mock data
    console.error('AWS call failed, using mock data:', error.message);
    return JSON.stringify({
      message: "Using sample investigation data (AWS call failed: " + error.message + ")",
      ...MOCK_INVESTIGATION
    }, null, 2);
  }
}

async function generateReport({ finding, format = 'markdown' }) {
  const timestamp = new Date().toISOString();
  const parsedFinding = typeof finding === 'string' ? JSON.parse(finding) : finding;
  
  const report = `# 🚨 Security Incident Report

**Generated**: ${timestamp}
**Report ID**: RPT-${Date.now()}

## Executive Summary

**Threat Level**: ${parsedFinding.summary?.severity || 'Unknown'}/10
**Status**: Active Investigation
**Affected Resource**: ${parsedFinding.resource?.instanceId || 'Unknown'}

${parsedFinding.summary?.title || 'Security incident detected requiring investigation.'}

## Threat Details

- **Attack Type**: ${parsedFinding.threat?.actionType || 'Unknown'}
- **Source IP**: ${parsedFinding.threat?.attackerIP || 'Unknown'}
- **Country**: ${parsedFinding.threat?.attackerCountry || 'Unknown'}
- **Organization**: ${parsedFinding.threat?.attackerOrg || 'Unknown'}
- **ISP**: ${parsedFinding.threat?.attackerISP || 'Unknown'}

## Timeline

- **First Detected**: ${parsedFinding.timeline?.firstSeen || 'Unknown'}
- **Last Seen**: ${parsedFinding.timeline?.lastSeen || 'Unknown'}
- **Total Events**: ${parsedFinding.timeline?.count || 'Unknown'}

## Affected Resources

- **Resource Type**: ${parsedFinding.resource?.type || 'Unknown'}
- **Instance ID**: ${parsedFinding.resource?.instanceId || 'Unknown'}
- **Platform**: ${parsedFinding.resource?.platform || 'Unknown'}

## Recommendations

1. **Immediate Actions**:
   - Block source IP ${parsedFinding.threat?.attackerIP || '(unknown)'} at the firewall level
   - Review security group rules for exposed ports
   - Check CloudWatch logs for any successful authentication attempts

2. **Investigation Steps**:
   - Review CloudTrail logs for any API calls from the suspicious IP
   - Check if other resources were targeted
   - Verify no data exfiltration occurred

3. **Long-term Improvements**:
   - Implement rate limiting on exposed services
   - Enable AWS WAF for web-facing applications
   - Review and update security group rules quarterly

---
*Report generated by MCP Security Incident Response System*`;

  return report;
}

// Create server
const server = new Server(
  {
    name: 'mcp-security-incident-response',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler for listing tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_findings',
        description: 'List recent GuardDuty findings',
        inputSchema: {
          type: 'object',
          properties: {
            detectorId: { 
              type: 'string', 
              description: 'GuardDuty Detector ID'
            },
            maxResults: { 
              type: 'number', 
              description: 'Maximum findings to return',
              default: 500
            }
          },
          required: ['detectorId'],
        },
      },
      {
        name: 'investigate_finding',
        description: 'Deep dive into a specific finding',
        inputSchema: {
          type: 'object',
          properties: {
            detectorId: { 
              type: 'string',
              description: 'GuardDuty Detector ID'
            },
            findingId: { 
              type: 'string',
              description: 'Finding ID to investigate'
            }
          },
          required: ['detectorId', 'findingId'],
        },
      },
      {
        name: 'generate_report',
        description: 'Generate an incident report from finding data',
        inputSchema: {
          type: 'object',
          properties: {
            finding: { 
              type: 'object',
              description: 'The investigated finding data'
            },
            format: { 
              type: 'string',
              description: 'Report format (markdown, executive, technical)',
              default: 'markdown'
            }
          },
          required: ['finding'],
        },
      },
    ],
  };
});

// Handler for calling tools - MCP compliant version
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    
    switch (name) {
      case 'list_findings':
        result = await listFindings(args);
        break;
      case 'investigate_finding':
        result = await investigateFinding(args);
        break;
      case 'generate_report':
        result = await generateReport(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Correct MCP-compliant response format
    return {
      content: [
        {
          type: 'text',
          text: result
        }
      ]
    };
  } catch (error) {
    // Return error in MCP-compliant format
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ]
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Security Incident Response System started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});