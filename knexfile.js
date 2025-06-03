// Update with your config settings.

require("dotenv").config();

module.exports = {
  development: {
    client: "pg",
    connection: {
      host: "127.0.0.1",
      port: 5432,
      database: "pixelaid",
    },
    pool: { min: 0, max: 10 },
  },
  production: {
    client: "pg",
    connection: process.env.DATABASE_URL + "?ssl=true",
  },
};
