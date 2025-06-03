exports.seed = function (knex) {
  return knex.transaction(async (trx) => {
    await trx("user_group").del();
    await trx("user_group").insert([
      {
        user_id: 1,
        group_id: 1,
      },
      {
        user_id: 2,
        group_id: 1,
      },
      {
        user_id: 3,
        group_id: 1,
      },
    ]);
  });
};
