exports.seed = function (knex) {
  return knex.transaction(async (trx) => {
    await trx("question").del();
    await trx("question").insert([
      {
        title: "Hey thanks for help on the ERD's",
        body: "hey where is the data model for users",
        user_id: 1,
        created_at: "Today",
      },
      {
        title: "Hey thanks for help on the ERD's",
        body: "hey where is the data model for users",
        user_id: 3,
        created_at: "Today",
      },
      {
        title: "Hey thanks for help on the ERD's",
        body: "hey where is the data model for users",
        user_id: 2,
        created_at: "Today",
      },
    ]);
  });
};
