const { Client } = require("pg");

const client = new Client({
  host: "localhost",
  port: 5432,
  database: "pixelaid",
});

(async () => {
  try {
    await client.connect(); // Ensure connection is awaited
    const res = await client.query("SELECT 1+1 AS result");
    console.log(res.rows[0]); // Output result
  } catch (err) {
    console.error("Error connecting to PostgreSQL:", err);
  } finally {
    await client.end(); // Ensure the client is properly disconnected
  }
})();
