'use strict';

import { CloudFrontRequestEvent } from 'aws-lambda/trigger/cloudfront-request';
import fetch from 'node-fetch';
import jwkToPem from 'jwk-to-pem';
import jwt from 'jsonwebtoken';
import { AuthHeader, JWKS, DecodedJWT } from './types';
import { Callback } from 'aws-lambda/handler';
import { getSSMParameter } from '../ssmParameterReader';

export async function handler(
  event: CloudFrontRequestEvent,
  context: never,
  callback: Callback
): Promise<boolean | void> {
  console.log('Auth@Edge getting started!');
  console.log('Event: ', event);

  const region = 'us-east-1';

  const userPoolId = await getUserPoolId();
  if (!userPoolId) return exitWithFailure('Failed to fetch user pool id', callback);

  const cfRequest = event.Records[0].cf.request;
  const headers = cfRequest.headers;
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

  console.log('User Pool ID: ', userPoolId);
  console.log('Region: ', region);
  console.log('Issuer: ', issuer);

  const jwks = await fetchJWKS(issuer);
  if (!jwks) return exitWithFailure('No JWKS keys to parse', callback);

  const pems = convertJWKSKeysToPems(jwks);

  console.log('Successfully converted pems: ', pems);

  const authorizationHeader: AuthHeader = headers.authorization || headers.Authorization;
  if (!authorizationHeader) return exitWithFailure('No auth header!', callback);

  const token = getJWT(authorizationHeader);
  console.log('JWT: ', token);

  const decodedJWT = decodeJWT(token);
  if (!decodedJWT) return exitWithFailure('Not a valid JWT token', callback);

  if (decodedJWT.payload?.iss !== issuer)
    return exitWithFailure(`Invalid issuer: ${decodedJWT.payload?.iss}`, callback);

  if (decodedJWT.payload?.token_use !== 'access')
    return exitWithFailure(`Not an access token. Got: ${decodedJWT.payload.token_use}`, callback);

  const kid = decodedJWT.header.kid;
  const pem = pems[kid];

  if (!pem) return exitWithFailure('Invalid access token', callback);

  jwt.verify(token, pem, { issuer }, function (err) {
    if (err) return exitWithFailure('Token failed verification', callback);

    console.log('Successful verification');

    callback(null, cfRequest);
    return true;
  });
}

async function getUserPoolId(): Promise<string | undefined> {
  try {
    const userPoolId = await getSSMParameter('/applications/fil/user-pool');
    return userPoolId;
  } catch (err) {
    console.log('Failed to fetch user pool id:', err, err.stack);
  }
}

async function fetchJWKS(issuer: string): Promise<JWKS | undefined> {
  const url = `${issuer}` + '/.well-known/jwks.json';

  console.log(`Fetching JWKS keys from ${url}`);

  return new Promise((resolve) => {
    fetch(url)
      .then((res) => res.json())
      .then((json) => resolve(json))
      .catch((err) => {
        console.log('Failed to fetch JWKS keys. Aborting...', err, err.stack);
        resolve(undefined);
      });
  });
}

function convertJWKSKeysToPems(jwks: JWKS): { [kid: string]: string } {
  const pems: { [kid: string]: string } = {};

  jwks.keys.forEach((key) => {
    const { kid: keyId, n, e } = key;
    const pem = jwkToPem({
      kty: 'RSA',
      e,
      n
    });
    pems[keyId] = pem;
  });

  return pems;
}

function getJWT(authorizationHeader: AuthHeader): string {
  return authorizationHeader[0].value.slice(7);
}

function decodeJWT(token: string): DecodedJWT {
  return jwt.decode(token, { complete: true }) as DecodedJWT;
}

function exitWithFailure(
  failureMessage: string,
  callback: Callback,
  response = {
    status: '401',
    statusDescription: 'Unauthorized'
  }
): false {
  console.log(failureMessage);
  callback(null, response);
  return false;
}
