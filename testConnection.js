const knexConfig = require("./knexfile").development;
const knex = require("knex")(knexConfig);

knex
  .raw("SELECT 1+1 AS result")
  .then(console.log)
  .catch(console.error)
  .finally(() => knex.destroy());
