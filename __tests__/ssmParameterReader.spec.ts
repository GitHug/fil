import { getSSMParameter, reset } from '../src/ssmParameterReader';
import SSMClient from 'aws-sdk/clients/ssm';

describe('utils', () => {
  const client = new SSMClient({ region: 'us-east-1' });
  beforeEach(() => {
    jest.clearAllMocks();
    reset();
  });

  describe('getSSMParameter', () => {
    it('should get the user pool id from SSM if it is not already fetched', async () => {
      const parameter = await getSSMParameter('/application/param');

      expect(client.getParameter).toHaveBeenCalled();
      expect(parameter).toContain('us-east-1');
    });

    it('should cache the parameters so it only needs to access SSM once for the same parameter', async () => {
      const response1 = await getSSMParameter('/application/param');
      const response2 = await getSSMParameter('/application/param');
      const response3 = await getSSMParameter('/application/something-else');

      expect(client.getParameter).toHaveBeenCalledTimes(2);

      expect(response2).toEqual(response1);
      expect(response3).not.toEqual(response1);
    });
  });
});
