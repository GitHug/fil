import { Callback, Context, PostConfirmationTriggerEvent, PostConfirmationTriggerHandler } from 'aws-lambda';
import dataApiClient from 'data-api-client';
import { INSERT_INTO_USERS } from '../queries';

const data = dataApiClient({
  secretArn: process.env.SECRET_ARN,
  resourceArn: process.env.RDS_CLUSTER,
  database: process.env.DATABASE_NAME,
  options: {
    maxRetries: 10,
    retryDelayOptions: { base: 5000 }
  }
});

export const handler: PostConfirmationTriggerHandler = async (
  event: PostConfirmationTriggerEvent,
  context: Context,
  callback: Callback
) => {
  context.callbackWaitsForEmptyEventLoop = false;
  console.log('User confirm: ', event);

  const { userAttributes } = event.request;
  const { sub, email } = userAttributes;

  console.log('Query to execute: ', INSERT_INTO_USERS);

  try {
    const result = await data.query(INSERT_INTO_USERS, { sub, email });
    console.log('Query result: ', result);
    callback(null, event);
  } catch (err) {
    callback(err);
  }
};
