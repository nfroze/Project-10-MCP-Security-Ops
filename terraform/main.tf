# EventBridge Rule for High Severity GuardDuty Findings
resource "aws_cloudwatch_event_rule" "guardduty_high_severity" {
  name        = "guardduty-ec2-isolation"
  description = "Trigger on high severity GuardDuty findings"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [{
        numeric = [">=", 7]
      }]
      resource = {
        resourceType = ["Instance"]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.guardduty_high_severity.name
  target_id = "IsolateEC2Lambda"
  arn       = aws_lambda_function.isolate_ec2.arn
}

resource "aws_lambda_function" "isolate_ec2" {
  filename         = "lambda-deployment.zip"
  function_name    = "guardduty-isolate-ec2"
  role            = aws_iam_role.lambda_role.arn
  handler         = "isolate-ec2.handler"
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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"
    }
  }
}