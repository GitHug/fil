import { CREATE_USERS_TABLE, CREATE_UPLOADS_TABLE } from '../queries';
import dataApiClient from 'data-api-client';
import { Context, Callback } from 'aws-lambda/handler';
import { SQSEvent, SQSHandler } from 'aws-lambda/trigger/sqs';

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

  try {
    await data.transaction().query(CREATE_USERS_TABLE).query(CREATE_UPLOADS_TABLE).commit();
    console.log('Sanity check:', await data.query('select * from users'));
    console.log('Sanity check:', await data.query('select * from uploads'));

    console.log('Transaction committed successfully');
    callback();
  } catch (error) {
    console.log('Failed to create transaction', error);
    callback(error);
  }
};
