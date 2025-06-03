exports.seed = function (knex) {
  return knex.transaction(async (trx) => {
    await trx("answer").del();
    await trx("answer").insert([
      {
        body: "Answer number 1",
        question_id: 1,
        user_id: 2,
        votes: 5,
        created_at: "Today",
        answer_username: "devin-h",
      },
      {
        body: "Answer number 2",
        question_id: 2,
        user_id: 3,
        votes: 5,
        created_at: "Today",
        answer_username: "jordan-f",
      },
      {
        body: "Answer number 3",
        question_id: 3,
        user_id: 1,
        votes: 5,
        created_at: "Today",
        answer_username: "admin",
      },
    ]);
  });
};
