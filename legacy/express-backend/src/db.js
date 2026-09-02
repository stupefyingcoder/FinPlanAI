// // // src/db.js
// // const mysql = require("mysql2/promise");
// // const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = require("./config");

// // const pool = mysql.createPool({
// //   host: DB_HOST || "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
// //   user: DB_USER || "root",
// //   password: DB_PASS || "",
// //   database: DB_NAME || "mavericks",
// //   waitForConnections: true,
// //   connectionLimit: 10,
// //   queueLimit: 0,
// //   timezone: "+00:00"
// // });

// // module.exports = pool;

// // src/db.js

// import mysql from "mysql2/promise";
// import { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME } from "./config/index.js";

// const pool = mysql.createPool({
//   host: DB_HOST,
//   port: DB_PORT ? parseInt(DB_PORT) : 4000,
//   user: DB_USER,
//   password: DB_PASS,
//   database: DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   timezone: "+00:00"
// });

// export default pool;

// src/db.js
import mysql from "mysql2/promise";
import fs from "fs";
import { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, DB_SSL_CA_PATH } from "./config/index.js";

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT ? parseInt(DB_PORT) : 4000,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
  ssl: {
    ca: fs.readFileSync(DB_SSL_CA_PATH)
  }
});

export default pool;
