export const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id int(10) unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sub VARCHAR (255) NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX users_sub_index (sub),
  INDEX users_email_index (email(255))
);`;

export const CREATE_UPLOADS_TABLE = `
CREATE TABLE IF NOT EXISTS uploads (
  id int(10) unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  object_key VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  user_id int(10) unsigned NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uploads_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id)
);`;

export const INSERT_INTO_USERS = `
INSERT INTO users (sub, email) VALUES (:sub, :email);
`;

export const INSERT_INTO_UPLOADS = `
INSERT INTO uploads (object_key, name, user_id) VALUES (:key, :name, (SELECT id FROM users WHERE sub = :user));
`;
