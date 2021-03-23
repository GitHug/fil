import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceHandler,
  CloudFormationCustomResourceResponse
} from 'aws-lambda/trigger/cloudformation-custom-resource';
import SQS, { SendMessageRequest } from 'aws-sdk/clients/sqs';
import axios, { AxiosRequestConfig } from 'axios';
import { Context, Callback } from 'aws-lambda/handler';

const sqs = new SQS({ region: 'us-east-1' });

export const handler: CloudFormationCustomResourceHandler = async (
  event: CloudFormationCustomResourceEvent,
  context: Context,
  callback: Callback<void>
) => {
  console.log('Request received:\n', JSON.stringify(event, null, 2));
  console.log('Request type:', event.RequestType);

  const responseURL = event.ResponseURL;

  switch (event.RequestType) {
    case 'Create':
      await handleCreate(event, context, callback);
      break;
    case 'Update':
      await handleUpdate(event, context, callback);
      break;
    case 'Delete':
      await handleDelete(event, context, callback);
      break;
    default:
      const error = new Error('Unknown request type');
      const response = createResponseObject('FAILED', event, context, { Error: error.message });
      await sendResponse(response, responseURL, callback);
      callback(error);
      throw error;
  }
};

const handleUpdate = async (event: CloudFormationCustomResourceEvent, context: Context, callback: Callback) => {
  const response = createResponseObject('SUCCESS', event, context);
  await sendResponse(response, event.ResponseURL, callback);
};

const handleDelete = async (event: CloudFormationCustomResourceEvent, context: Context, callback: Callback) => {
  const response = createResponseObject('SUCCESS', event, context);
  await sendResponse(response, event.ResponseURL, callback);
};

const handleCreate = async (event: CloudFormationCustomResourceEvent, context: Context, callback: Callback) => {
  const response = createResponseObject('SUCCESS', event, context);

  const params: SendMessageRequest = {
    QueueUrl: process.env.QUEUE,
    MessageBody: JSON.stringify(response)
  };

  console.log('Params:\n', params);
  console.log('Sending message...');

  try {
    await sendMessage(params);
    console.log('Message sent successfully');
  } catch (err) {
    console.log('Failed to put message on message queue:\n', err);
    await sendResponse(
      createResponseObject('FAILED', event, context, { Error: 'Failed to put message on message queue' }),
      event.ResponseURL,
      callback
    );
  }

  await sendResponse(response, event.ResponseURL, callback);
};

const createResponseObject = (
  responseStatus: 'SUCCESS' | 'FAILED',
  event: CloudFormationCustomResourceEvent,
  context: Context,
  responseData?: {
    [Key: string]: string;
  }
): CloudFormationCustomResourceResponse => ({
  Status: responseStatus,
  Reason: 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
  PhysicalResourceId: context.logStreamName,
  StackId: event.StackId,
  RequestId: event.RequestId,
  LogicalResourceId: event.LogicalResourceId,
  Data: responseData
});

const sendMessage = async (params: SendMessageRequest): Promise<void> => {
  return new Promise((resolve, reject) => {
    sqs.sendMessage(params, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

async function sendResponse(
  response: CloudFormationCustomResourceResponse,
  responseURL: CloudFormationCustomResourceEvent['ResponseURL'],
  callback: Callback
) {
  console.log('Response body:\n', JSON.stringify(response, null, 2));

  const responseBody = JSON.stringify(response);

  const timeout30s = 3 * 1000;

  const options: AxiosRequestConfig = {
    headers: {
      'content-type': '',
      'content-length': responseBody.length
    },
    timeout: timeout30s,
    timeoutErrorMessage: 'Unable to handle custom resource response in a timely manner. Request timed out.'
  };

  console.log('Sending response...\n');

  try {
    await axios.put(responseURL, responseBody, options);

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
