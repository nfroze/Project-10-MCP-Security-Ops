const AWS = require('aws-sdk');
const https = require('https');

const ec2 = new AWS.EC2();
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    const finding = event.detail;
    
    // Use correct PascalCase for GuardDuty finding properties
    const instanceId = finding.Resource?.InstanceDetails?.InstanceId;
    
    if (!instanceId) {
      console.log('No EC2 instance found in finding');
      console.log('Resource details:', JSON.stringify(finding.Resource, null, 2));
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No EC2 instance in finding' })
      };
    }

    console.log(`Processing instance: ${instanceId}`);

    // Create isolation security group if it doesn't exist
    const isolationSgName = 'guardduty-isolation-sg';
    let isolationSgId;
    
    try {
      const sgs = await ec2.describeSecurityGroups({
        GroupNames: [isolationSgName]
      }).promise();
      isolationSgId = sgs.SecurityGroups[0].GroupId;
      console.log(`Using existing isolation SG: ${isolationSgId}`);
    } catch (error) {
      // Create isolation SG with no ingress/egress rules
      console.log('Creating new isolation security group');
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
      console.log(`Created isolation SG: ${isolationSgId}`);
    }

    // Get current security groups before isolation (for restoration later)
    const instanceDetails = await ec2.describeInstances({
      InstanceIds: [instanceId]
    }).promise();
    
    const originalSGs = instanceDetails.Reservations[0]?.Instances[0]?.SecurityGroups?.map(sg => sg.GroupId) || [];
    console.log(`Original security groups: ${originalSGs.join(', ')}`);

    // Apply isolation security group
    console.log(`Applying isolation SG to instance ${instanceId}`);
    await ec2.modifyInstanceAttribute({
      InstanceId: instanceId,
      Groups: [isolationSgId]
    }).promise();

    // Tag instance for tracking (including original SGs for restoration)
    await ec2.createTags({
      Resources: [instanceId],
      Tags: [
        { Key: 'IsolatedBy', Value: 'GuardDuty' },
        { Key: 'IsolationTime', Value: new Date().toISOString() },
        { Key: 'FindingId', Value: finding.Id || 'unknown' },
        { Key: 'FindingType', Value: finding.Type || 'unknown' },
        { Key: 'OriginalSecurityGroups', Value: originalSGs.join(',') }
      ]
    }).promise();
    console.log('Instance tagged successfully');

    // Send Slack alert
    const slackMessage = {
      text: `🚨 EC2 Instance Isolated: ${instanceId}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 Security Alert: EC2 Instance Isolated",
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Instance ID:*\n\`${instanceId}\``
            },
            {
              type: "mrkdwn",
              text: `*Severity:*\n${finding.Severity || 'Unknown'}/10`
            },
            {
              type: "mrkdwn",
              text: `*Finding Type:*\n${finding.Type || 'Unknown'}`
            },
            {
              type: "mrkdwn",
              text: `*Region:*\n${process.env.AWS_REGION || 'eu-west-2'}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Title:* ${finding.Title || 'Security Finding'}\n\n*Description:* ${finding.Description || 'No description available'}`
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Action Taken:* Instance has been isolated from network access. Original security groups: \`${originalSGs.join(', ')}\``
          }
        }
      ]
    };

    await sendSlackNotification(slackMessage);
    console.log('Slack notification sent successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Instance isolated successfully',
        instanceId,
        originalSecurityGroups: originalSGs
      })
    };
    
  } catch (error) {
    console.error('Error in handler:', error);
    
    // Try to send error notification to Slack
    try {
      await sendSlackNotification({
        text: `❌ Lambda Error`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Error in GuardDuty Lambda:*\n\`\`\`${error.message}\`\`\``
            }
          }
        ]
      });
    } catch (slackError) {
      console.error('Failed to send error to Slack:', slackError);
    }
    
    throw error;
  }
};

async function sendSlackNotification(message) {
  if (!SLACK_WEBHOOK_URL) {
    console.error('SLACK_WEBHOOK_URL is not set!');
    throw new Error('Slack webhook URL not configured');
  }
  
  console.log('Sending to Slack webhook...');
  const data = JSON.stringify(message);
  const url = new URL(SLACK_WEBHOOK_URL);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        console.log(`Slack response: ${res.statusCode} - ${responseData}`);
        if (res.statusCode === 200) {
          resolve(res.statusCode);
        } else {
          reject(new Error(`Slack API returned ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Slack request error:', error);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}