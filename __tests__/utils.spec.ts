import { userPoolIdGetter, resetUserPoolId } from '../src/utils';
import { SSMClient } from '@aws-sdk/client-ssm';

describe('utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetUserPoolId();
  });

  describe('userPoolIdGetter', () => {
    it('should get the user pool id from SSM if it is not already fetched', async () => {
      const client = new SSMClient({ region: 'us-east-1' });

      const userPoolId = await userPoolIdGetter();

      expect(client.send).toHaveBeenCalled();
      expect(userPoolId).toBe('us-east-1_123abc');
    });

    it('should cache the user pool so it only needs to access SSM once', async () => {
      const client = new SSMClient({ region: 'us-east-1' });

      await userPoolIdGetter();
      await userPoolIdGetter();

      expect(client.send).toHaveBeenCalledTimes(1);
    });
  });
});
