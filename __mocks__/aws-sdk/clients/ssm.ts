const gen = (function* () {
  let val = 1;
  while (true) {
    yield val++;
  }
})();

export const getParameterFn = jest.fn(
  (params: { Name: string }, callback?: (err?: Error, data?: { Parameter: { Value: string } }) => void) => {
    callback(undefined, {
      Parameter: {
        Value: `us-east-1_${gen.next().value}`
      }
    });
  }
);

export default class SSM {
  region: string;

  constructor(config: { region: string }) {
    this.region = config.region;
  }

  getParameter = getParameterFn;
}
