exports.seed = function (knex) {
  return knex.transaction(async (trx) => {
    await trx("users").del();
    await trx("users").insert([
      {
        name: "admin",
        username: "admin",
        email: "admin@gmail.com",
        password: "keyboardcat",
        admin: true,
        pixel_count: 100000,
        picture_id: 1,
      },
      {
        name: "devin",
        username: "devin-h",
        email: "devin@gmail.com",
        password: "keyboardcat",
        admin: false,
        pixel_count: 50,
        picture_id: 1,
      },
      {
        name: "Jordan",
        username: "jordan-f",
        email: "jordan@gmail.com",
        password: "keyboardcat",
        admin: false,
        pixel_count: 50,
        picture_id: 1,
      },
    ]);
  });
};
