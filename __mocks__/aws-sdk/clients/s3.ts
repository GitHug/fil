import { HeadObjectOutput, ManagedUpload } from 'aws-sdk/clients/s3';

const uploadPromiseFn = jest.fn(() => Promise.resolve());
const uploadFn = jest.fn(
  () =>
    ({
      promise: uploadPromiseFn as unknown
    } as ManagedUpload)
);

const headObjectPromiseFn = jest.fn(() =>
  Promise.resolve({
    Metadata: {
      name: 'test_file',
      user: 'XXXXXXXX-YYYY-ZZZZZ-AAAAAAAAAAA'
    }
  })
);

const headObjectFn = jest.fn(
  () =>
    ({
      promise: headObjectPromiseFn as unknown
    } as HeadObjectOutput)
);

export default class S3 {
  region: string;

  constructor(config: { region: string }) {
    this.region = config.region;
  }

  upload = uploadFn;
  headObject = headObjectFn;
}
