# Project 10: MCP Security Ops

## Overview

Model Context Protocol server providing Claude Desktop access to AWS GuardDuty findings for security investigation and report generation.

## Architecture

```
Claude Desktop ←→ MCP Server ←→ AWS GuardDuty
                      ↓
                 Investigation
                      ↓
              Automated Reports
```

## Technologies

- Protocol: Model Context Protocol (MCP)
- Language: Node.js
- Cloud: AWS GuardDuty
- AI: Claude Desktop integration
- Security: IAM roles, credential chain

## Installation

1. Clone repository
```bash
git clone https://github.com/nfroze/Project-10-MCP-Security-Incident-Response-System.git
cd Project-10-MCP-Security-Incident-Response-System
```

2. Install dependencies
```bash
npm install
```

3. Configure AWS credentials
```bash
aws configure
```

4. Add to Claude Desktop config
```json
{
  "mcpServers": {
    "security-incident-response": {
      "command": "node",
      "args": ["path/to/src/index.js"]
    }
  }
}
```

## Features

### Natural Language Queries
- Retrieve findings by severity
- Filter by time periods
- Identify affected resources
- Generate incident reports

### Automated Analysis
- Finding categorisation
- Pattern identification
- Attack source analysis
- Remediation suggestions

### Report Generation
- Markdown-formatted output
- Severity assessment
- Technical summaries
- Remediation priorities

## Example Queries

```
"Show me all critical findings from the last 24 hours"
"Which EC2 instances are compromised?"
"Create a summary report for these security findings"
"What ports are being targeted?"
```

## Testing

The system was tested with:
- 362 sample GuardDuty findings
- SSH brute force attempts
- Crypto mining detection scenarios

## Screenshots

1. GuardDuty findings in AWS console
2. Claude Desktop conversation for executive briefing
3. Incident response report generation
4. MCP tools available in Claude
5. Initial security detection
6. Critical incident dashboard
7. Post-remediation confirmation
8. All-clear status dashboard

## Generated Reports

- Executive Summary Report
- Incident Response Report
- HTML dashboards for incident briefing and debrief

## Project Structure

```
Project-10-MCP-Security-Ops/
├── src/
│   └── index.js          # MCP server implementation
├── screenshots/          # Documentation images
├── ExecutiveSummary.md   # Sample generated report
├── IncidentResponse.md   # Sample incident report
├── briefing.html        # Incident dashboard
└── debrief.html         # Post-incident dashboard
```

## Use Cases

- Incident response automation
- Security finding analysis
- Report generation
- Pattern analysis across findings
- Documentation for compliance