exports.seed = function (knex) {
  return knex.transaction(async (trx) => {
    await trx("canvas").del();
    await trx("canvas").insert([
      { group_id: 1 },
      { group_id: 2 },
      { group_id: 3 },
    ]);
  });
};
