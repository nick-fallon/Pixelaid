exports.seed = function (knex) {
  return knex.transaction(async (trx) => {
    await trx("profile_picture").del();
    await trx("profile_picture").insert([
      {
        row_0: "YGYGYGYGYGYGYGYG",
        row_1: "GYGYGYGYGYGYGYGY",
        row_2: "YGYGYGYGYGYGYGYG",
        row_3: "GYGYGYGYGYGYGYGY",
        row_4: "YGYGYGYGYGYGYGYG",
        row_5: "GYGYGYGYGYGYGYGY",
        row_6: "YGYGYGYGYGYGYGYG",
        row_7: "GYGYGYGYGYGYGYGY",
        row_8: "YGYGYGYGYGYGYGYG",
        row_9: "GYGYGYGYGYGYGYGY",
        row_10: "YGYGYGYGYGYGYGYG",
        row_11: "GYGYGYGYGYGYGYGY",
        row_12: "YGYGYGYGYGYGYGYG",
        row_13: "GYGYGYGYGYGYGYGY",
        row_14: "YGYGYGYGYGYGYGYG",
        row_15: "GYGYGYGYGYGYGYGY",
      },
    ]);
  });
};
