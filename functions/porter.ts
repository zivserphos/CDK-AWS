import { APIGatewayProxyResult, SQSEvent } from "aws-lambda";
import * as AWS from "aws-sdk";

exports.handler = async (event: SQSEvent): Promise<APIGatewayProxyResult> => {
  const S3 = new AWS.S3();
  const bucketName = "reports-cymotive1.1";
  console.log(event);
  const reports = JSON.parse(event.Records[0].body);
  console.log(reports);
  if (!reports.length) throw new Error("Failed");
  for (let i = 0; i < reports.length; i++) {
    await S3.putObject({
      Bucket: bucketName,
      Key: `${reports[i].vehicleId}.json`,
      Body: JSON.stringify(reports[i]),
    }).promise();
  }
  return { statusCode: 200, body: "success" };
};
