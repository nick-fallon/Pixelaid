exports.seed = function (knex) {
  return knex.transaction(async (trx) => {
    await trx("kudo").del();
    await trx("kudo").insert([
      {
        body: "Hey thanks for help on the ERD's",
        to_user_id: 2,
        from_user_id: 1,
        votes: 5,
        created_at: "Today",
        from: "admin",
        to: "devin-h",
      },
      {
        body: "Hey thanks for help on the ERD's",
        to_user_id: 2,
        from_user_id: 3,
        votes: 5,
        created_at: "Today",
        from: "jodan-f",
        to: "devin-h",
      },
      {
        body: "Hey thanks for help on the ERD's",
        to_user_id: 3,
        from_user_id: 2,
        votes: 5,
        created_at: "Today",
        from: "devin-h",
        to: "jordan-f",
      },
    ]);
  });
};
