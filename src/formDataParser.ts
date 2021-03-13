import { APIGatewayEvent } from 'aws-lambda';
import Busboy from 'busboy';
import { ParsedFormData } from './handlers/types';

const getContentType = (event) => {
  const contentType = event.headers['content-type'];
  if (!contentType) {
    return event.headers['Content-Type'];
  }
  return contentType;
};

export default (event: APIGatewayEvent): Promise<ParsedFormData> =>
  new Promise((resolve, reject) => {
    const busboy = new Busboy({
      headers: {
        'content-type': getContentType(event)
      }
    });
    const result = {
      file: undefined,
      fileName: undefined,
      contentType: undefined
    };
    busboy.on('file', (fieldName, file, fileName, encoding, mimeType) => {
      file.on('data', (data) => {
        result.file = data;
      });
      file.on('end', () => {
        result.fileName = fileName;
        result.contentType = mimeType;
      });
    });
    busboy.on('field', (fieldName, value) => {
      result[fieldName] = value;
    });
    busboy.on('error', (error: Error) => reject(`Parse error: ${error}`));
    busboy.on('finish', () => resolve(result));
    busboy.write(event.body, event.isBase64Encoded ? 'base64' : 'binary');
    busboy.end();
  });
