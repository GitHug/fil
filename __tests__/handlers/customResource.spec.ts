import { handler } from '../../src/handlers/customResource';
import event from '../../events/customResource.json';
import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse
} from 'aws-lambda/trigger/cloudformation-custom-resource';
import { Context } from 'aws-lambda/handler';
import axios from 'axios';
import { mocked } from 'ts-jest/utils';
import { AWSError } from 'aws-sdk/lib/error';
import SQS, { SendMessageResult } from 'aws-sdk/clients/sqs';
import { Request } from 'aws-sdk';

jest.mock('axios', () => ({
  put: jest.fn(() => Promise.resolve())
}));

describe('Custom resource to put message on SQS queue to trigger DB migrations', () => {
  const customResourceEvent = (event as unknown) as CloudFormationCustomResourceEvent;
  const context: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'CustomResourceHandler',
    functionVersion: '1.0',
    invokedFunctionArn: 'arn:aws-cloudformation',
    awsRequestId: '123',
    memoryLimitInMB: '128',
    logGroupName: '/log/group/name',
    logStreamName: '/log/stream/name',
    getRemainingTimeInMillis: () => 0,
    done: () => ({}),
    fail: () => ({}),
    succeed: () => ({})
  };

  const callback = jest.fn();

  const createExpectedResponse = (
    event: CloudFormationCustomResourceEvent,
    context: Context,
    status: 'SUCCESS' | 'FAILED',
    Data?: {
      [key: string]: string;
    }
  ): CloudFormationCustomResourceResponse => ({
    Status: status,
    Reason: 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data
  });

  const createExpectedAxiosConfig = (response: CloudFormationCustomResourceResponse) => ({
    headers: {
      'content-type': '',
      'content-length': JSON.stringify(response).length
    },
    timeout: 3000,
    timeoutErrorMessage: 'Unable to handle custom resource response in a timely manner. Request timed out.'
  });

  const sqs = new SQS({ region: 'us-east-1' });

  const sendMessageMock = mocked(sqs.sendMessage, true);
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['Delete', 'Update'])('should respond with SUCCESS if it is %s event', async (requestType: string) => {
    customResourceEvent.RequestType = requestType as 'Delete' | 'Update';

    await handler(customResourceEvent, context, callback);

    const expectedResponse = createExpectedResponse(customResourceEvent, context, 'SUCCESS');

    expect(axios.put).toHaveBeenCalledWith(
      event.ResponseURL,
      JSON.stringify(expectedResponse),
      createExpectedAxiosConfig(expectedResponse)
    );

    expect(callback).toHaveBeenCalled();
  });

  it('should respond with FAILED if sending data on SQS fails', async () => {
    customResourceEvent.RequestType = 'Create';

    const mock = (params: never, cb: (err: string) => void) => {
      cb('Failed to send message');
      return;
    };

    const mockImplementation = (mock as unknown) as (
      cb: (err: AWSError, data: SendMessageResult) => void
    ) => Request<SendMessageResult, AWSError>;

    sendMessageMock.mockImplementationOnce(mockImplementation);

    await handler(customResourceEvent, context, callback);

    expect(sendMessageMock).toHaveBeenCalledWith(
      {
        MessageBody: JSON.stringify(createExpectedResponse(customResourceEvent, context, 'SUCCESS')),
        QueueUrl: 'aws.sqs.queue/my-queue'
      },
      expect.any(Function)
    );

    const expectedResponse = createExpectedResponse(customResourceEvent, context, 'FAILED', {
      Error: 'Failed to put message on message queue'
    });

    expect(axios.put).toHaveBeenCalledWith(
      event.ResponseURL,
      JSON.stringify(expectedResponse),
      createExpectedAxiosConfig(expectedResponse)
    );

    expect(callback).toHaveBeenCalled();
  });

  it('should throw an error if sending a response fails', async () => {
    customResourceEvent.RequestType = 'Create';

    const putMock = mocked(axios.put, true);
    putMock.mockRejectedValueOnce(new Error('Failed to send'));

    expect(handler(customResourceEvent, context, callback)).rejects.toThrowError(
      'Could not send CloudFormation response'
    );
  });

  it('should send a success response to S3 if putting data on SQS was successful', async () => {
    customResourceEvent.RequestType = 'Create';

    await handler(customResourceEvent, context, callback);

    const expectedResponse = createExpectedResponse(customResourceEvent, context, 'SUCCESS');

    expect(axios.put).toHaveBeenCalledWith(
      event.ResponseURL,
      JSON.stringify(expectedResponse),
      createExpectedAxiosConfig(expectedResponse)
    );

    expect(callback).toHaveBeenCalled();
  });
});
