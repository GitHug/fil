import { Callback } from 'aws-lambda';
import S3, { Metadata } from 'aws-sdk/clients/s3';
import { S3Event, S3Handler } from 'aws-lambda/trigger/s3';
import dataApiClient from 'data-api-client';
import { INSERT_INTO_UPLOADS } from '../queries';

const s3 = new S3({ region: 'us-east-1' });

const data = dataApiClient({
  secretArn: process.env.SECRET_ARN,
  resourceArn: process.env.RDS_CLUSTER,
  database: process.env.DATABASE_NAME,
  options: {
    maxRetries: 10,
    retryDelayOptions: { base: 5000 }
  }
});

export const handler: S3Handler = async (event: S3Event, context: never, callback: Callback) => {
  console.log('Incoming trigger:\n', JSON.stringify(event, null, 2));

  const key = event.Records[0].s3.object.key;
  const bucket = event.Records[0].s3.bucket.name;

  console.log('Key:', key);
  console.log('Bucket:', bucket);

  console.log('Fetching meta data...');
  const meta = await fetchObjectMetadata(key, bucket, callback);
  if (!meta) {
    console.log('No metadata present');
    callback(new Error('No metadata'));
    return;
  }

  console.log('Meta: ', meta);

  const { name, user } = meta;

  try {
    const result = await data.query(INSERT_INTO_UPLOADS, { key, name, user });
    console.log('Query result:', result);
    callback(null, event);
  } catch (err) {
    console.log('Failed to execute query:', err);
    callback(err);
  }
};

const fetchObjectMetadata = async (key: string, bucket: string, callback: Callback): Promise<Metadata | undefined> => {
  try {
    const output = await s3
      .headObject({
        Key: key,
        Bucket: bucket
      })
      .promise();

    console.log('Head retrieved\n', JSON.stringify(output, null, 2));

    return output.Metadata;
  } catch (err) {
    console.log('Failed to get object meta data', err);
    callback(err);
  }
};
