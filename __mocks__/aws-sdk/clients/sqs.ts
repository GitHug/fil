import { SendMessageResult } from 'aws-sdk/clients/sqs';
import { AWSError } from 'aws-sdk/lib/error';

const sendMessageFn = jest.fn((params: never, cb: (error: AWSError, Data: SendMessageResult) => void) => {
  const data = {} as SendMessageResult;
  cb(null, data);
});

export default class SQS {
  sendMessage = sendMessageFn;
}
