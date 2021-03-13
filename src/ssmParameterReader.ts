import SSM from 'aws-sdk/clients/ssm';

function getSSMParameterClosure(): { get: (path: string) => Promise<string>; reset: () => void } {
  const parameters: { [path: string]: string } = {};

  const client = new SSM({ region: 'us-east-1' });

  return {
    async get(path: string): Promise<string> {
      if (parameters[path]) return parameters[path];

      const query = {
        Name: path
      };

      return new Promise((resolve, reject) => {
        client.getParameter(query, (err, data) => {
          if (err) {
            console.log(err, err.stack);
            reject(err);
          } else {
            const userPoolId = data.Parameter.Value;
            parameters[path] = userPoolId;
            resolve(userPoolId);
          }
        });
      });
    },

    reset() {
      Object.keys(parameters).forEach((path) => {
        parameters[path] = undefined;
      });
    }
  };
}

export const { get: getSSMParameter, reset } = getSSMParameterClosure();
