const AWS = require('aws-sdk');
const https = require('https');

const ec2 = new AWS.EC2();
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

exports.handler = async (event) => {
  const finding = event.detail;
  let instanceId = finding.resource?.instanceDetails?.instanceId;
  
  // Redirect sample findings to your test instance
  if (!instanceId || instanceId.startsWith('i-99999999')) {
    console.log('Sample finding detected, using test instance');
    instanceId = 'i-061d92470ce5a2311';  // Your actual instance
  }
  
  if (!instanceId) {
    console.log('No EC2 instance found in finding');
    return;
  }

  // Create isolation security group if it doesn't exist
  const isolationSgName = 'guardduty-isolation-sg';
  let isolationSgId;
  
  try {
    const sgs = await ec2.describeSecurityGroups({
      GroupNames: [isolationSgName]
    }).promise();
    isolationSgId = sgs.SecurityGroups[0].GroupId;
  } catch (error) {
    // Create isolation SG with no ingress/egress rules
    const newSg = await ec2.createSecurityGroup({
      GroupName: isolationSgName,
      Description: 'Isolation security group for compromised instances'
    }).promise();
    isolationSgId = newSg.GroupId;
    
    // Remove default egress rule
    await ec2.revokeSecurityGroupEgress({
      GroupId: isolationSgId,
      IpPermissions: [{
        IpProtocol: '-1',
        CidrIp: '0.0.0.0/0'
      }]
    }).promise();
  }

  // Apply isolation security group
  await ec2.modifyInstanceAttribute({
    InstanceId: instanceId,
    Groups: [isolationSgId]
  }).promise();

  // Tag instance for tracking
  await ec2.createTags({
    Resources: [instanceId],
    Tags: [
      { Key: 'IsolatedBy', Value: 'GuardDuty' },
      { Key: 'IsolationTime', Value: new Date().toISOString() },
      { Key: 'FindingId', Value: finding.id },
      { Key: 'FindingType', Value: finding.type }
    ]
  }).promise();

  // Send Slack alert
  const slackMessage = {
    text: `🚨 EC2 Instance Isolated`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚨 Security Alert: EC2 Instance Isolated"
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Instance:*\n${instanceId}`
          },
          {
            type: "mrkdwn",
            text: `*Severity:*\n${finding.severity}/10`
          },
          {
            type: "mrkdwn",
            text: `*Finding Type:*\n${finding.type}`
          },
          {
            type: "mrkdwn",
            text: `*Description:*\n${finding.title}`
          }
        ]
      }
    ]
  };

  await sendSlackNotification(slackMessage);
  
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      message: 'Instance isolated successfully',
      instanceId 
    })
  };
};

async function sendSlackNotification(message) {
  const data = JSON.stringify(message);
  
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(SLACK_WEBHOOK_URL, options, (res) => {
      resolve(res.statusCode);
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}