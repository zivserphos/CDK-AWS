import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  //@ts-ignore
  console.log(event.queryStringParameters.method);
  let params = {
    TableName: "ids-table2",
  };
  let response;
  //@ts-ignore

  switch (event.queryStringParameters.method) {
    case "number_of_reports":
      //@ts-ignore
      params.Select = "COUNT";
      response = await docClient.scan(params).promise();
      //@ts-ignore
      return { statusCode: 200, body: response.Count };
      break;
    case "number_of_vehicles":
      //@ts-ignore
      params.Select = "COUNT";
      response = await docClient.scan(params).promise();
      //@ts-ignore
      return { statusCode: 200, body: response.Count };
      break;
    case "number_of_anomalies":
      response = await docClient.scan(params).promise();
      const reports = response.Items;
      const outOfSignal = [];
      //@ts-ignore
      for (let i = 0; i < reports.length; i++) {
        if (
          //@ts-ignore
          reports[i].signalsPerMinute.windows.sum >
          //@ts-ignore
          reports[i].signalsPerMinute.windows.acceptableMaxValue
        ) {
          console.log("more then acceptableMaxValue");
          //@ts-ignore
          outOfSignal.push(reports[i]);
        } else if (
          //@ts-ignore
          reports[i].signalsPerMinute.windows.sum <
          //@ts-ignore
          reports[i].signalsPerMinute.windows.acceptableMinValue
        ) {
          console.log("less then acceptableMaxValue");
          //@ts-ignore
          outOfSignal.push(reports[i]);
        } else {
          console.log("IN RANGE");
        }
      }
      console.log("kaki");
      return { statusCode: 200, body: outOfSignal.length.toString() };
      break;
    default:
      //@ts-ignore
      return;
  }
};
