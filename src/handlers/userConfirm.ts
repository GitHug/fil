import SQS, { SendMessageRequest } from 'aws-sdk/clients/sqs';
import {
  PostConfirmationTriggerEvent,
  PostConfirmationTriggerHandler
} from 'aws-lambda/trigger/cognito-user-pool-trigger/post-confirmation';
import { Callback, Context } from 'aws-lambda/handler';

const sqs = new SQS({ region: 'us-east-1' });

export const handler: PostConfirmationTriggerHandler = async (
  event: PostConfirmationTriggerEvent,
  context: Context,
  callback: Callback
) => {
  console.log('User confirm:\n', JSON.stringify(event, null, 2));

  const { userAttributes } = event.request;
  const { sub, email } = userAttributes;

  const params: SendMessageRequest = {
    QueueUrl: process.env.QUEUE,
    MessageBody: JSON.stringify({
      sub,
      email
    })
  };

  console.log('Params:\n', params);
  console.log('Sending message...');

  try {
    await sendMessage(params);
    console.log('Message sent successfully');
    callback(null, event);
  } catch (err) {
    console.log('Failed to send message:\n', err);
    callback(err);
  }
};

const sendMessage = async (params: SendMessageRequest): Promise<void> => {
  return new Promise((resolve, reject) => {
    sqs.sendMessage(params, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
