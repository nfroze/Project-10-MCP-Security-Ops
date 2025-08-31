# EventBridge Rule for GuardDuty Findings
resource "aws_cloudwatch_event_rule" "guardduty_high_severity" {
  name        = "guardduty-ec2-isolation"
  description = "Trigger on medium to high severity GuardDuty findings"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [{
        numeric = [">=", 4]  # Lowered to catch SSH brute force (medium severity)
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
  runtime         = "nodejs16.x"
  timeout         = 60

  source_code_hash = filebase64sha256("lambda-deployment.zip")

  environment {
    variables = {
      SLACK_WEBHOOK_URL = var.slack_webhook_url
    }
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "guardduty-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# IAM Policy for Lambda
resource "aws_iam_role_policy" "lambda_policy" {
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:ModifyInstanceAttribute",
          "ec2:DescribeSecurityGroups",
          "ec2:CreateSecurityGroup",
          "ec2:RevokeSecurityGroupEgress",
          "ec2:CreateTags",
          "ec2:DeleteTags"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Permission for EventBridge to invoke Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.isolate_ec2.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.guardduty_high_severity.arn
}