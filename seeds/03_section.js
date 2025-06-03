exports.seed = function (knex) {
  return knex.transaction(async (trx) => {
    await trx("section").del();

    const entries = [];
    for (let i = 0; i < 15; i++) {
      entries.push({
        canvas_id: 1,
        row_0: "WEWEWEWEWEWEWEWE",
        row_1: "EWEWEWEWEWEWEWEW",
        row_2: "WEWEWEWEWEWEWEWE",
        row_3: "EWEWEWEWEWEWEWEW",
        row_4: "WEWEWEWEWEWEWEWE",
        row_5: "EWEWEWEWEWEWEWEW",
        row_6: "WEWEWEWEWEWEWEWE",
        row_7: "EWEWEWEWEWEWEWEW",
        row_8: "WEWEWEWEWEWEWEWE",
        row_9: "EWEWEWEWEWEWEWEW",
        row_10: "WEWEWEWEWEWEWEWE",
        row_11: "EWEWEWEWEWEWEWEW",
        row_12: "WEWEWEWEWEWEWEWE",
        row_13: "EWEWEWEWEWEWEWEW",
        row_14: "WEWEWEWEWEWEWEWE",
        row_15: "EWEWEWEWEWEWEWEW",
      });
    }

    await trx("section").insert(entries);
  });
};
