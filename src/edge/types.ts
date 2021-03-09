export type JWKS = {
  keys: {
    kid: string;
    n: string;
    e: string;
    kty: string;
  }[];
};

export type AuthHeader = {
  value: string;
}[];

export type DecodedJWT = {
  payload?: {
    iss: string;
    token_use: string;
  };
  header: {
    kid: string;
  };
};
