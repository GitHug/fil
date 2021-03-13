import formDataParser from '../src/formDataParser';
import event from '../events/apiGWUpload.json';

describe('formDataParser', () => {
  it('extracts content type, file, file name and name from event body', async () => {
    const response = await formDataParser(event);
    expect(response.name).toBe('Hello World');
    expect(response.contentType).toBe('text/plain');
    expect(response.fileName).toBe('test.txt');
    expect(response.file).toBeInstanceOf(Buffer);
  });
});
