import { ManagedUpload } from 'aws-sdk/clients/s3';

export const promiseFn = jest.fn(() => Promise.resolve());

export const uploadFn = jest.fn(
  () =>
    ({
      promise: promiseFn as unknown
    } as ManagedUpload)
);

export default class S3 {
  region: string;

  constructor(config: { region: string }) {
    this.region = config.region;
  }

  upload = uploadFn;
}
