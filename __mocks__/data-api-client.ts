const commitFn = jest.fn();
const queryFn = jest.fn(() => ({
  query: queryFn,
  commit: commitFn
}));
const transactionFn = jest.fn(() => ({
  query: queryFn
}));

export default function (): unknown {
  return {
    transaction: transactionFn,
    query: queryFn,
    commit: commitFn
  };
}
