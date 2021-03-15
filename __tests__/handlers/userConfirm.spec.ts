import { handler } from '../../src/handlers/userConfirm';
import event from '../../events/postConfirmation.json';
import { mocked } from 'ts-jest/utils';
import dataApiClient from 'data-api-client';
import { Context } from 'aws-lambda/handler';
import { PostConfirmationTriggerEvent } from 'aws-lambda/trigger/cognito-user-pool-trigger/post-confirmation';
import { INSERT_INTO_USERS } from '../../src/queries';

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

    await handler(event as PostConfirmationTriggerEvent, {} as Context, callback);

    expect(callback).toHaveBeenCalledWith('Failed to execute query');
  });

  it('should call callback with the event if query execution succeeds', async () => {
    await handler(event as PostConfirmationTriggerEvent, {} as Context, callback);

    expect(queryMock).toHaveBeenCalledWith(INSERT_INTO_USERS, {
      sub: 'f273d312-ab87-42c2-abcf-a7f600565144',
      email: 'test@example.com'
    });

    expect(callback).toHaveBeenCalledWith(null, event);
  });
});
