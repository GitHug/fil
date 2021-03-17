import { INSERT_INTO_USERS } from '../queries';
import { Callback, Context } from 'aws-lambda/handler';
import { SQSEvent, SQSHandler } from 'aws-lambda';
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

export const handler: SQSHandler = async (event: SQSEvent, context: Context, callback: Callback) => {
  console.log('SQS message received:\n', JSON.stringify(event, null, 2));

  const body = event.Records[0].body;

  const { sub, email } = parseBody(body);
  if (!sub || !email) {
    console.log('Email and/or sub is missing');
    callback(new Error('No email or sub'));
  }

  console.log('Query to execute: ', INSERT_INTO_USERS, sub, email);

  try {
    const result = await data.query(INSERT_INTO_USERS, { sub, email });
    console.log('Query result: ', result);
    callback(null, event);
  } catch (err) {
    console.log('Failed to execute query:\n', err);
    callback(err);
  }
};

const parseBody = (body: string): { sub?: string; email?: string } => {
  try {
    const { sub, email } = JSON.parse(body);
    return { sub, email };
  } catch (err) {
    console.log('Failed to parse body');
    return {};
  }
};
