import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

exports.handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const s3 = new AWS.S3();
  //@ts-ignore
  const key = event.Records[0].s3.object.key;
  //@ts-ignore
  const bucketName = event.Records[0].s3.bucket.name;

  const data = await s3.getObject({ Bucket: bucketName, Key: key }).promise();
  if (data.Body) {
    const report = JSON.parse(data.Body.toString());

    const dynamoDb = new AWS.DynamoDB.DocumentClient();
    await dynamoDb.put({ TableName: "ids-table2", Item: report }).promise();
    return { statusCode: 200, body: "success" };
  } else {
    return { statusCode: 500, body: "Error" };
  }
};
