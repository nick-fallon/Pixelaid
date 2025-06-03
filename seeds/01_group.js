exports.seed = function (knex) {
  return knex.transaction(async (trx) => {
    await trx("groups").del();
    await trx("groups").insert([
      { name: "g46" },
      { name: "g46" },
      { name: "g51" },
    ]);
  });
};
