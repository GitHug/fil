import { handler } from '../../src/handlers/userConfirm';
import event from '../../events/postConfirmation.json';
import { mocked } from 'ts-jest/utils';
import { Context } from 'aws-lambda/handler';
import { PostConfirmationTriggerEvent } from 'aws-lambda/trigger/cognito-user-pool-trigger/post-confirmation';
import SQS, { SendMessageResult } from 'aws-sdk/clients/sqs';
import { AWSError } from 'aws-sdk/lib/error';
import { Request } from 'aws-sdk';

describe('user post confirmation handler', () => {
  const sqs = new SQS({ region: 'us-east-1' });

  const sendMessageMock = mocked(sqs.sendMessage, true);

  const callback = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call callback with an error if sending message on SQS fails', async () => {
    const mock = (params: never, cb: (err: string) => void) => {
      cb('Failed to send message');
      return;
    };

    const mockImplementation = (mock as unknown) as (
      cb: (err: AWSError, data: SendMessageResult) => void
    ) => Request<SendMessageResult, AWSError>;

    sendMessageMock.mockImplementationOnce(mockImplementation);

    await handler(event as PostConfirmationTriggerEvent, {} as Context, callback);

    expect(callback).toHaveBeenCalledWith('Failed to send message');
  });

  it('should call callback with the event if sending message is successful', async () => {
    await handler(event as PostConfirmationTriggerEvent, {} as Context, callback);

    expect(sendMessageMock).toHaveBeenCalledWith(
      {
        MessageBody: JSON.stringify({
          sub: 'f273d312-ab87-42c2-abcf-a7f600565144',
          email: 'test@example.com'
        }),
        QueueUrl: 'aws.sqs.queue/my-queue'
      },
      expect.any(Function)
    );

    expect(callback).toHaveBeenCalledWith(null, event);
  });
});
