export type ParsedFormData = {
  file: Buffer;
  fileName: string;
  contentType: string;
  name?: string;
};

export type LambdaResponse = {
  statusCode: number;
  headers: {
    [header: string]: string;
  };
  body: string;
};
