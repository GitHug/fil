import { handler } from '../../src/handlers/dbMigration';
import { SQSEvent } from 'aws-lambda/trigger/sqs';
import { Context } from 'aws-lambda/handler';
import dataApiClient from 'data-api-client';
import { mocked } from 'ts-jest/utils';
import { CREATE_USERS_TABLE, CREATE_UPLOADS_TABLE } from '../../src/queries';

const data = dataApiClient({
  secretArn: 'any',
  resourceArn: 'any'
});

const mockedTransaction = mocked(data.transaction, true);

describe('DB migration custom resource handler', () => {
  const event = ({} as unknown) as SQSEvent;
  const context = {} as Context;

  const callback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call callback with an error if query execution fails', async () => {
    mockedTransaction.mockImplementationOnce(() => {
      throw new Error('Unable to execute query');
    });

    await handler(event, context, callback);

    expect(callback).toHaveBeenCalledWith(new Error('Unable to execute query'));
  });

  it('should execute the requested queries', async () => {
    const spy = jest.spyOn(data, 'query');

    await handler(event, context, callback);

    expect(spy).toHaveBeenCalledWith(CREATE_USERS_TABLE);
    expect(spy).toHaveBeenCalledWith(CREATE_UPLOADS_TABLE);

    expect(callback).toHaveBeenCalledWith();
  });
});
