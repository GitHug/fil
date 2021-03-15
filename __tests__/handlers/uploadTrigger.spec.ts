import { handler } from '../../src/handlers/uploadTrigger';
import event from '../../events/s3UploadTrigger.json';
import { S3Event } from 'aws-lambda/trigger/s3';
import S3, { HeadObjectOutput, HeadObjectRequest } from 'aws-sdk/clients/s3';
import { mocked } from 'ts-jest/utils';
import { PromiseResult } from 'aws-sdk/lib/request';
import { AWSError } from 'aws-sdk/lib/error';
import dataApiClient from 'data-api-client';
import { INSERT_INTO_UPLOADS } from '../../src/queries';

jest.mock('data-api-client', () => {
  const query = jest.fn(() => Promise.resolve());

  return () => ({
    query
  });
});

describe('upload trigger handler', () => {
  const s3Event = (event as unknown) as S3Event;
  const callback = jest.fn();
  const s3 = new S3({ region: 'us-east-1' });

  const headObjectMock = mocked(s3.headObject, true);
  const headObjectPromiseMock = mocked(s3.headObject({} as HeadObjectRequest).promise, true);
  const queryMock = mocked(
    dataApiClient({
      secretArn: '',
      resourceArn: ''
    }).query,
    true
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call callback with error if fetching object metadata fails', async () => {
    headObjectPromiseMock.mockRejectedValueOnce('Failed to communicate with S3');

    await handler(s3Event, {} as never, callback);

    expect(callback).toHaveBeenCalledWith('Failed to communicate with S3');
  });

  it('should call callback with error if there are no meta data', async () => {
    headObjectPromiseMock.mockResolvedValueOnce({} as PromiseResult<HeadObjectOutput, AWSError>);

    await handler(s3Event, {} as never, callback);

    expect(callback).toHaveBeenCalledWith(new Error('No metadata'));
  });

  it('should have called headObject with the uploaded key and the correct bucket', async () => {
    await handler(s3Event, {} as never, callback);

    expect(headObjectMock).toHaveBeenCalledWith({
      Bucket: 'XXXXXXXX-bucket',
      Key: 'a704f20d6dfd7682a5db8be7a4d8bb6d58aeb1ed7dc24270fd1f5ead5d9e0af5'
    });
  });

  it('should call callback with error if query execution fails', async () => {
    queryMock.mockRejectedValueOnce('Incorrect SQL syntax');

    await handler(s3Event, {} as never, callback);

    expect(callback).toHaveBeenCalledWith('Incorrect SQL syntax');
  });

  it('should respond with event if query execution is successful', async () => {
    await handler(s3Event, {} as never, callback);

    expect(queryMock).toHaveBeenCalledWith(INSERT_INTO_UPLOADS, {
      key: 'a704f20d6dfd7682a5db8be7a4d8bb6d58aeb1ed7dc24270fd1f5ead5d9e0af5',
      name: 'test_file',
      user: 'XXXXXXXX-YYYY-ZZZZZ-AAAAAAAAAAA'
    });

    expect(callback).toHaveBeenCalledWith(null, s3Event);
  });
});
