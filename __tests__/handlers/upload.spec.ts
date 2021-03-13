import { handler } from '../../src/handlers/upload';
import event from '../../events/apiGWUpload.json';
import { mocked } from 'ts-jest/utils';
import formDataParser from '../../src/formDataParser';
import S3 from 'aws-sdk/clients/s3';

jest.mock('../../src/formDataParser', () =>
  jest.fn(() => ({
    fileName: 'test.txt',
    file: Buffer.from(JSON.stringify('hello world')),
    contentType: 'text/plain',
    name: 'Hello World'
  }))
);

jest.mock('uuid', () => ({
  v4: () => 'b177a68d-1d1e-4c54-9aff-42dea88cc48c'
}));

describe('upload handler', () => {
  const s3 = new S3({ region: 'us-east-1' });

  const uploadMock = mocked(s3.upload, true);
  const uploadPromiseMock = mocked(s3.upload({} as S3.PutObjectRequest).promise, true);

  const formDataParserMock = mocked(formDataParser, true);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a 500 if parsing form data fails', async () => {
    formDataParserMock.mockRejectedValueOnce('Unable to parse!');
    const output = await handler(event);

    expect(output).toEqual({
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to parse form data',
        cause: 'Unable to parse!'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  });

  it('returns a 500 if S3 upload fails', async () => {
    uploadPromiseMock.mockRejectedValueOnce('Unable to connect to S3');

    const output = await handler(event);

    expect(output).toEqual({
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to upload to S3',
        cause: 'Unable to connect to S3'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  });

  it('returns a 201 if file is uploaded successfully', async () => {
    const output = await handler(event);

    expect(uploadMock).toHaveBeenCalledWith({
      Bucket: 'my-bucket',
      Key: 'b177a68d-1d1e-4c54-9aff-42dea88cc48c',
      Body: expect.any(Buffer),
      ContentType: 'text/plain',
      Metadata: {
        name: 'Hello World'
      },
      ContentDisposition: 'attachment; filename="test.txt"'
    });

    expect(output).toEqual({
      statusCode: 201,
      body: JSON.stringify({
        key: 'b177a68d-1d1e-4c54-9aff-42dea88cc48c'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  });
});
