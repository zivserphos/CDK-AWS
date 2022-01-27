import {
  Stack,
  StackProps,
  aws_s3,
  aws_apigateway,
  aws_lambda,
  Duration,
  aws_dynamodb,
  aws_lambda_event_sources,
  aws_sqs,
  aws_iam,
  aws_lambda_nodejs,
} from "aws-cdk-lib";
import { IntegrationOptions } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { join } from "path";

export class AwsCdkCymotiveStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new aws_s3.Bucket(this, "reports-cymotive1.1", {
      bucketName: "reports-cymotive1.1",
    });

    const porterRole = new aws_iam.Role(this, "PorterRole", {
      assumedBy: new aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      roleName: "PorterRole",
      description: "Role for porter lambda",
      inlinePolicies: {
        PorterPolicy: new aws_iam.PolicyDocument({
          statements: [
            new aws_iam.PolicyStatement({
              effect: aws_iam.Effect.ALLOW,
              actions: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
              ],
              resources: [
                `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/*:*:*`,
              ],
            }),
            new aws_iam.PolicyStatement({
              effect: aws_iam.Effect.ALLOW,
              actions: ["s3:PutObject"],
              resources: [bucket.bucketArn],
            }),
          ],
        }),
      },
    });

    const porter = new aws_lambda_nodejs.NodejsFunction(this, "porter2", {
      entry: join(__dirname, "..", "functions", "porter.ts"),
      handler: "handler",
      functionName: "porter2",
      timeout: Duration.seconds(8),
      role: porterRole,
    });

    bucket.grantWrite(porter);

    const api = new aws_apigateway.RestApi(this, "cymotive-reports", {
      deployOptions: {
        stageName: "api",
      },
      restApiName: "cymotive-reports",
      endpointTypes: [aws_apigateway.EndpointType.REGIONAL],
    });

    const recordsQueue = new aws_sqs.Queue(this, "recordsSqsQueue", {
      queueName: "recordsQueue",
    });

    const idsGatewayRole = new aws_iam.Role(this, "IdsGatewayRole", {
      assumedBy: new aws_iam.ServicePrincipal("apigateway.amazonaws.com"),
    });
    const methodOptions: IntegrationOptions = {
      credentialsRole: idsGatewayRole,
      passthroughBehavior: aws_apigateway.PassthroughBehavior.NEVER,
      requestParameters: {
        "integration.request.header.Content-Type":
          "'application/x-www-form-urlencoded'",
      },
      requestTemplates: {
        "application/json":
          'Action=SendMessage&QueueUrl=$util.urlEncode("' +
          recordsQueue.queueUrl +
          '")&MessageBody=$util.urlEncode($input.body)', //Request body
      },
      integrationResponses: [{ statusCode: "200" }],
    };

    api.root.addMethod(
      "POST",
      new aws_apigateway.AwsIntegration({
        service: "sqs",
        region: this.region,
        path: `${this.account}/${recordsQueue.queueName}`,
        integrationHttpMethod: "POST",
        options: methodOptions,
      }),
      { methodResponses: [{ statusCode: "200" }] }
    );

    porter.addEventSource(
      new aws_lambda_event_sources.SqsEventSource(recordsQueue, {
        enabled: true,
      })
    );

    recordsQueue.grantSendMessages(idsGatewayRole);
    recordsQueue.grantConsumeMessages(porterRole);

    const table = new aws_dynamodb.Table(this, "ids-table2.0", {
      tableName: "ids-table2",
      partitionKey: {
        name: "vehicleId",
        type: aws_dynamodb.AttributeType.STRING,
      },
    });

    const ingest = new aws_lambda_nodejs.NodejsFunction(this, "ingest2", {
      entry: join(__dirname, "..", "functions", "ingest.ts"),
      handler: "handler",
      functionName: "ingest2",
      timeout: Duration.seconds(8),
    });

    bucket.grantRead(ingest);
    table.grantWriteData(ingest);

    const s3PutEventSource = new aws_lambda_event_sources.S3EventSource(
      bucket,
      {
        events: [aws_s3.EventType.OBJECT_CREATED_PUT],
      }
    );
    ingest.addEventSource(s3PutEventSource);

    const analyzer = new aws_lambda_nodejs.NodejsFunction(this, "analyzer2", {
      entry: join(__dirname, "..", "functions", "analyzer.ts"),
      handler: "handler",
      functionName: "analyzer2",
      timeout: Duration.seconds(8),
    });

    table.grantFullAccess(analyzer);

    const countInfo = new aws_apigateway.LambdaIntegration(analyzer, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' },
    });

    api.root.addMethod("GET", countInfo);
  }
}
