import { handler } from '../../src/handlers/dbMigration';
import event from '../../events/customResource.json';
import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse
} from 'aws-lambda/trigger/cloudformation-custom-resource';
import { Context } from 'aws-lambda/handler';
import axios from 'axios';
import dataApiClient from 'data-api-client';
import { mocked } from 'ts-jest/utils';
import { CREATE_USERS_TABLE, CREATE_UPLOADS_TABLE } from '../../src/queries';

jest.mock('axios', () => ({
  put: jest.fn(() => Promise.resolve())
}));

jest.mock('data-api-client', () =>
  jest.fn(function () {
    return {
      transaction: function () {
        return this;
      },
      query: function () {
        return this;
      },
      commit: () => Promise.resolve()
    };
  })
);

describe('DB migration custom resource handler', () => {
  const customResourceEvent = (event as unknown) as CloudFormationCustomResourceEvent;
  const context: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'DBMigrationHandler',
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
  const dataApiClientMock = mocked(dataApiClient, true);

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it.each(['Delete', 'Update'])('should respond with SUCCESS if it is %s event', async (requestType: string) => {
    customResourceEvent.RequestType = requestType as 'Delete' | 'Update';

    await handler(customResourceEvent, context, callback);

    const expectedResponse = createExpectedResponse(customResourceEvent, context, 'SUCCESS');

    expect(axios.put).toHaveBeenCalledWith(event.ResponseURL, JSON.stringify(expectedResponse), {
      headers: {
        'content-type': '',
        'content-length': JSON.stringify(expectedResponse).length
      }
    });

    expect(callback).toHaveBeenCalled();
  });

  it('should respond with FAILED if initializing the data api client fails', async () => {
    customResourceEvent.RequestType = 'Create';

    dataApiClientMock.mockImplementationOnce(() => {
      throw new Error('Failed to initialize');
    });

    await handler(customResourceEvent, context, callback);

    const expectedResponse = createExpectedResponse(customResourceEvent, context, 'FAILED', {
      Error: 'Failed to connect to RDS instance'
    });

    expect(axios.put).toHaveBeenCalledWith(event.ResponseURL, JSON.stringify(expectedResponse), {
      headers: {
        'content-type': '',
        'content-length': JSON.stringify(expectedResponse).length
      }
    });

    expect(callback).toHaveBeenCalled();
  });

  it('should respond with FAILED if query execution fails', async () => {
    customResourceEvent.RequestType = 'Create';

    dataApiClientMock.mockImplementationOnce(function () {
      return {
        transaction() {
          return this;
        },
        query() {
          return this;
        },
        commit: () => Promise.reject('Unable to execute query'),
        batchExecuteStatement: () => Promise.resolve(),
        beginTransaction: () => Promise.resolve() as Promise<unknown>,
        commitTransaction: () => Promise.resolve(),
        executeStatement: () => Promise.resolve(),
        rollbackTransaction: () => Promise.resolve()
      };
    });

    await handler(customResourceEvent, context, callback);

    const expectedResponse = createExpectedResponse(customResourceEvent, context, 'FAILED', {
      Error: 'Failed to execute DB statement'
    });

    expect(axios.put).toHaveBeenCalledWith(event.ResponseURL, JSON.stringify(expectedResponse), {
      headers: {
        'content-type': '',
        'content-length': JSON.stringify(expectedResponse).length
      }
    });

    expect(callback).toHaveBeenCalled();
  });

  it('should execute the requested queries', async () => {
    customResourceEvent.RequestType = 'Create';

    const dataApiAttributes = {
      transaction() {
        return this;
      },
      query() {
        return this;
      },
      commit: () => Promise.reject('Unable to execute query'),
      batchExecuteStatement: () => Promise.resolve(),
      beginTransaction: () => Promise.resolve() as Promise<unknown>,
      commitTransaction: () => Promise.resolve(),
      executeStatement: () => Promise.resolve(),
      rollbackTransaction: () => Promise.resolve()
    };

    const spy = jest.spyOn(dataApiAttributes, 'query');

    dataApiClientMock.mockImplementationOnce(function () {
      return dataApiAttributes;
    });

    await handler(customResourceEvent, context, callback);

    expect(spy).toHaveBeenCalledWith(CREATE_USERS_TABLE);
    expect(spy).toHaveBeenCalledWith(CREATE_UPLOADS_TABLE);
  });

  it('should respond with SUCCESS if transaction is successful', async () => {
    customResourceEvent.RequestType = 'Create';

    await handler(customResourceEvent, context, callback);

    const expectedResponse = createExpectedResponse(customResourceEvent, context, 'SUCCESS');

    expect(axios.put).toHaveBeenCalledWith(event.ResponseURL, JSON.stringify(expectedResponse), {
      headers: {
        'content-type': '',
        'content-length': JSON.stringify(expectedResponse).length
      }
    });

    expect(callback).toHaveBeenCalled();
  });

  it('should throw an error if sending fails', async () => {
    customResourceEvent.RequestType = 'Create';

    const putMock = mocked(axios.put, true);
    putMock.mockRejectedValueOnce(new Error('Failed to send'));

    expect(handler(customResourceEvent, context, callback)).rejects.toThrowError(
      'Could not send CloudFormation response'
    );
  });
});
