'use strict';

import { Callback, Context, PostConfirmationTriggerEvent, PostConfirmationTriggerHandler } from 'aws-lambda';
import dataApiClient from 'data-api-client';

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

  console.log('Query to execute: ', `insert into users (sub, email) values (${sub}, ${email});`);

  try {
    const result = await data.query('insert into users (sub, email) values (:sub, :email);', { sub, email });
    console.log('Query result: ', result);
    callback(null, event);
  } catch (err) {
    callback(err);
  }
};
