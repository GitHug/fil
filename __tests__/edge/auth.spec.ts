import { handler } from '../../src/edge/auth';
import event from '../../events/cloudfront.json';
import { CloudFrontRequestEvent } from 'aws-lambda/trigger/cloudfront-request';
import { getSSMParameter } from '../../src/utils';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import { mocked } from 'ts-jest/utils';

jest.mock('../../src/utils', () => ({
  getSSMParameter: jest.fn(() => 'us-east-1_abc')
}));

jest.mock('node-fetch', () =>
  jest.fn(() =>
    Promise.resolve({
      json: () => ({
        keys: [
          {
            kty: 'RSA',
            e: '123',
            n: '123',
            kid: 'abc'
          }
        ]
      })
    })
  )
);

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(() => ({
    payload: {
      iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc',
      token_use: 'access'
    },
    header: {
      kid: 'abc'
    }
  })),
  verify: jest.fn((token: string, pem: string, options: { issuer: string }, callback: (err?: Error) => boolean) => {
    callback();
  })
}));

describe('handler', () => {
  const cloudFrontEvent = (event as unknown) as CloudFrontRequestEvent;
  const context = undefined as never;
  const getSSMParameterMock = mocked(getSSMParameter, true);
  const fetchMock = mocked(fetch, true);
  const jwtDecodeMock = mocked(jwt.decode, true);
  const jwtVerifyMock = mocked(jwt.verify, true);
  const callback: (error?: string | Error, result?: unknown) => void = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should respond with forbidden if unable to fetch user pool id', async () => {
    getSSMParameterMock.mockRejectedValueOnce('SSM unavailable');

    const response = await handler(cloudFrontEvent, context, callback);

    expect(getSSMParameterMock).toHaveBeenCalledWith('/applications/fil/user-pool');

    expect(response).toBe(false);
    expect(callback).toHaveBeenCalledWith(null, {
      status: '401',
      statusDescription: 'Unauthorized'
    });
  });

  it('should respond with forbidden if failing to fetch JWKS', async () => {
    fetchMock.mockRejectedValueOnce('404');

    const response = await handler(cloudFrontEvent, context, callback);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc/.well-known/jwks.json'
    );
    expect(response).toBe(false);
    expect(callback).toHaveBeenCalledWith(null, {
      status: '401',
      statusDescription: 'Unauthorized'
    });
  });

  it('should respond with forbidden if authorization header is missing', async () => {
    const event = ({
      Records: [
        {
          cf: {
            request: {
              headers: {
                host: [
                  {
                    value: 'd123.cf.net',
                    key: 'Host'
                  }
                ]
              },
              clientIp: '2001:cdba::3257:9652',
              uri: '/experiment-pixel.jpg',
              method: 'GET'
            },
            config: {
              distributionId: 'EXAMPLE'
            }
          }
        }
      ]
    } as unknown) as CloudFrontRequestEvent;

    const response = await handler(event, context, callback);

    expect(response).toBe(false);
    expect(callback).toHaveBeenCalledWith(null, {
      status: '401',
      statusDescription: 'Unauthorized'
    });
  });

  it('should respond with forbidden if JWT can not be decoded', async () => {
    jwtDecodeMock.mockReturnValueOnce(undefined);

    const response = await handler(cloudFrontEvent, context, callback);

    expect(jwt.decode).toHaveBeenCalled();

    expect(response).toBe(false);
    expect(callback).toHaveBeenCalledWith(null, {
      status: '401',
      statusDescription: 'Unauthorized'
    });
  });

  it('should respond with forbidden if JWT issuer does not match', async () => {
    jwtDecodeMock.mockReturnValueOnce({
      payload: {
        iss: 'https://google.com',
        token_use: 'access'
      },
      header: {
        kid: ''
      }
    });

    const response = await handler(cloudFrontEvent, context, callback);

    expect(jwt.decode).toHaveBeenCalled();

    expect(response).toBe(false);
    expect(callback).toHaveBeenCalledWith(null, {
      status: '401',
      statusDescription: 'Unauthorized'
    });
  });

  it('should respond with forbidden if JWT is not an access token', async () => {
    jwtDecodeMock.mockReturnValueOnce({
      payload: {
        iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc',
        token_use: 'something_else'
      },
      header: {
        kid: ''
      }
    });

    const response = await handler(cloudFrontEvent, context, callback);

    expect(jwt.decode).toHaveBeenCalled();

    expect(response).toBe(false);
    expect(callback).toHaveBeenCalledWith(null, {
      status: '401',
      statusDescription: 'Unauthorized'
    });
  });

  it('should respond with forbidden if JWT access token is invalid', async () => {
    jwtDecodeMock.mockReturnValueOnce({
      payload: {
        iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc',
        token_use: 'access'
      },
      header: {
        kid: 'def'
      }
    });

    const response = await handler(cloudFrontEvent, context, callback);

    expect(jwt.decode).toHaveBeenCalled();

    expect(response).toBe(false);
    expect(callback).toHaveBeenCalledWith(null, {
      status: '401',
      statusDescription: 'Unauthorized'
    });
  });

  it('should respond with forbidden if JWT fails verifications', async () => {
    jwtVerifyMock.mockImplementationOnce((token, pem, options, callback) => {
      callback({ expiredAt: new Date(), inner: new Error('error'), name: 'expired', message: 'expired' }, null);
    });

    await handler(cloudFrontEvent, context, callback);

    expect(jwt.verify).toHaveBeenCalled();

    expect(callback).toHaveBeenCalledWith(null, {
      status: '401',
      statusDescription: 'Unauthorized'
    });
  });

  it('should respond with success if JWT pass verification', async () => {
    await handler(cloudFrontEvent, context, callback);

    expect(jwt.verify).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(null, cloudFrontEvent.Records[0].cf.request);
  });
});
