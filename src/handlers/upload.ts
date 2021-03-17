import { APIGatewayEvent } from 'aws-lambda';
import S3 from 'aws-sdk/clients/s3';
import formDataParser from '../formDataParser';
import { v4 as uuid } from 'uuid';
import { LambdaResponse, ParsedFormData } from './types';
import { getSSMParameter } from '../ssmParameterReader';

const s3 = new S3({
  region: 'us-east-1',
  signatureVersion: 'v4'
});

export async function handler(event: APIGatewayEvent): Promise<LambdaResponse> {
  console.log('Incoming request: ', JSON.stringify(event, null, 2));

  let formData: ParsedFormData;
  try {
    formData = await formDataParser(event);
  } catch (err) {
    console.log('Failed to parse form data ', err);

    return createResponse(500, {
      message: 'Failed to parse form data',
      cause: err
    });
  }
  console.log('Form data: ', formData.contentType, formData.fileName, formData.name);

  const key = uuid();

  console.log('BUCKET: ', process.env.BUCKET);

  const cloudfrontDomain = await getCloudFrontDomain();
  if (!cloudfrontDomain) {
    return createResponse(500, {
      message: 'Unexpected error'
    });
  }

  const s3Params: S3.PutObjectRequest = {
    Bucket: process.env.BUCKET,
    Key: key,
    Body: formData.file,
    ContentType: formData.contentType,
    Metadata: {
      name: formData.name || formData.fileName,
      user: event.requestContext.authorizer.claims?.sub
    },
    ContentDisposition: `attachment; filename="${formData.fileName}"`,
    ACL: 'public-read'
  };

  console.log('S3 params: ', s3Params);

  try {
    await s3.upload(s3Params).promise();
  } catch (err) {
    console.log('Failed to upload to S3', err);
    return createResponse(500, {
      message: 'Failed to upload to S3',
      cause: err
    });
  }

  return createResponse(201, { url: `${cloudfrontDomain}/${key}` });
}

const createResponse = (statusCode: number, body: { [key: string]: string }): LambdaResponse => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

async function getCloudFrontDomain(): Promise<string | undefined> {
  try {
    const userPoolId = await getSSMParameter('/applications/fil/cloudfront-domain');
    return userPoolId;
  } catch (err) {
    console.log('Failed to fetch user pool id:', err, err.stack);
  }
}
