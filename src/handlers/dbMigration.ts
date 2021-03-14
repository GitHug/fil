import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceHandler,
  CloudFormationCustomResourceResponse
} from 'aws-lambda/trigger/cloudformation-custom-resource';
import { CREATE_USERS_TABLE, CREATE_UPLOADS_TABLE } from '../queries';
import axios from 'axios';
import dataApiClient from 'data-api-client';
import { Context, Callback } from 'aws-lambda/handler';

export const handler: CloudFormationCustomResourceHandler = async (
  event: CloudFormationCustomResourceEvent,
  context: Context,
  callback: Callback<void>
) => {
  console.log('Request received:\n', JSON.stringify(event, null, 2));

  if (['Delete', 'Update'].includes(event.RequestType)) {
    await sendResponse(event, context, callback, 'SUCCESS');
    return;
  }

  try {
    const data = dataApiClient({
      secretArn: process.env.SECRET_ARN,
      resourceArn: process.env.RDS_CLUSTER,
      database: process.env.DATABASE_NAME,
      options: {
        maxRetries: 10,
        retryDelayOptions: { base: 5000 }
      }
    });

    console.log('Executing query: ', CREATE_USERS_TABLE);
    console.log('Executing query: ', CREATE_UPLOADS_TABLE);

    try {
      await data.transaction().query(CREATE_USERS_TABLE).query(CREATE_UPLOADS_TABLE).commit();
      console.log(await data.query('select * from users'));
      console.log(await data.query('select * from uploads'));

      console.log('Transaction committed successfully');
    } catch (error) {
      console.log('DB statement error:', error);
      await sendResponse(event, context, callback, 'FAILED', { Error: 'Failed to execute DB statement' });
      return;
    }
  } catch (error) {
    console.log('RDS connection failed:', error);
    await sendResponse(event, context, callback, 'FAILED', { Error: 'Failed to connect to RDS instance' });
    return;
  }

  await sendResponse(event, context, callback, 'SUCCESS');
};

async function sendResponse(
  event: CloudFormationCustomResourceEvent,
  context: Context,
  callback: Callback<void>,
  responseStatus: 'SUCCESS' | 'FAILED',
  responseData?: {
    [Key: string]: string;
  }
) {
  const response: CloudFormationCustomResourceResponse = {
    Status: responseStatus,
    Reason: 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData
  };

  console.log('Response body:\n', JSON.stringify(response, null, 2));

  const responseBody = JSON.stringify(response);

  const options = {
    headers: {
      'content-type': '',
      'content-length': responseBody.length
    }
  };

  console.log('Sending response...\n');

  try {
    await axios.put(event.ResponseURL, responseBody, options);

    console.log('Response sent successfully');

    callback();
  } catch (error) {
    console.log('Sending response failed:');

    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      console.log(error.request);
    } else {
      console.log('Error', error.message);
    }

    console.log(error.config);

    throw new Error('Could not send CloudFormation response');
  }
}
