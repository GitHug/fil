import { handler } from '../../src/handlers/createUser';
import event from '../../events/sqsMessage.json';
import { mocked } from 'ts-jest/utils';
import dataApiClient from 'data-api-client';
import { Context } from 'aws-lambda/handler';
import { INSERT_INTO_USERS } from '../../src/queries';
import { SQSEvent } from 'aws-lambda';

jest.mock('data-api-client', () => {
  const query = jest.fn(() => Promise.resolve());

  return () => ({
    query
  });
});

describe('user post confirmation handler', () => {
  const queryMock = mocked(
    dataApiClient({
      secretArn: '',
      resourceArn: ''
    }).query,
    true
  );

  const callback = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call callback with an error if query execution fails', async () => {
    queryMock.mockRejectedValueOnce('Failed to execute query');

    await handler(event as SQSEvent, {} as Context, callback);

    expect(callback).toHaveBeenCalledWith('Failed to execute query');
  });

  it('should call callback with the event if query execution succeeds', async () => {
    await handler(event as SQSEvent, {} as Context, callback);

    expect(queryMock).toHaveBeenCalledWith(INSERT_INTO_USERS, {
      sub: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXX',
      email: 'XXXXXXk@XXXXX.XX'
    });

    expect(callback).toHaveBeenCalledWith(null, event);
  });
});
