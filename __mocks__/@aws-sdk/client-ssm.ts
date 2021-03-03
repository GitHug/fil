export const sendFn = jest.fn(() => ({
  Parameter: {
    Value: 'us-east-1_123abc'
  }
}));

export class SSMClient {
  region: string;

  constructor(config: { region: string }) {
    this.region = config.region;
  }

  send = sendFn;
}

export class GetParameterCommand {
  name: string;

  constructor(config: { Name: string }) {
    this.name = config.Name;
  }
}
