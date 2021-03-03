import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const paramterName = '/applications/fil/user-pool';

function getUserPoolId(): { get: () => Promise<string>; reset: () => void } {
  let userPoolId: string;

  return {
    async get() {
      if (userPoolId) return userPoolId;

      const client = new SSMClient({ region: 'us-east-1' });

      const command = new GetParameterCommand({
        Name: paramterName
      });
      const data = await client.send(command);

      if (!data.Parameter?.Value) throw new Error('Failed to fetch user pool id');

      userPoolId = data.Parameter.Value;
      return userPoolId;
    },
    reset() {
      userPoolId = '';
    }
  };
}

const closure = getUserPoolId();

export const userPoolIdGetter = closure.get;
export const resetUserPoolId = closure.reset;
