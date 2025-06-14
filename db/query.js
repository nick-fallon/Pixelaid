const pg = require("./knex");

function getAll() {
  return pg("question").orderBy("id", "desc");
}

function add(obj) {
  return pg("question").insert(obj);
}

function deleteQuestion(id) {
  return pg("answer")
    .where("question_id", id)
    .del()
    .then((data) => {
      return pg("question").where("id", id).del();
    });
}

function getAnswers(id) {
  return pg("answer")
    .fullOuterJoin("question", "question.id", "answer.question_id")
    .select(
      "*",
      "answer.body as answer_body",
      "answer.id as answer_id",
      "answer.answer_username as answer_username",
    )
    .where("question.id", "=", id)
    .orderBy("votes", "desc");
}

//get the canvas and tables.
function getCanvas() {
  return pg("section").orderBy("id", "asc");
}

//update the canvas
function updateCanvas(obj) {
  let temp = obj["json"];
  let newObj = JSON.parse(temp);
  return pg("section").where("id", newObj.section["id"]).update({
    row_0: newObj.section[0],
    row_1: newObj.section[1],
    row_2: newObj.section[2],
    row_3: newObj.section[3],
    row_4: newObj.section[4],
    row_5: newObj.section[5],
    row_6: newObj.section[6],
    row_7: newObj.section[7],
    row_8: newObj.section[8],
    row_9: newObj.section[9],
    row_10: newObj.section[10],
    row_11: newObj.section[11],
    row_12: newObj.section[12],
    row_13: newObj.section[13],
    row_14: newObj.section[14],
    row_15: newObj.section[15],
  });
}

//subtract pixels from user total
function subtractPixels(data, id, pixel) {
  let temp = data["json"];
  let newObj = JSON.parse(temp);
  let count = pixel - +newObj.pixels;

  return pg("users").where("id", id).update({ pixel_count: count });
}

function addAnswer(obj, user) {
  return pg("answer").insert({
    body: obj.body,
    question_id: obj.question_id,
    votes: obj.votes,
    user_id: user.id,
    answer_username: user.name,
  });
}

function addPixel(obj) {
  let currentPixels = +obj["pixel_count"] + 11;
  return pg("users")
    .where("id", obj["id"])
    .update({ pixel_count: currentPixels });
}

function joinEndorse(answerId) {
  return pg("users")
    .fullOuterJoin("answer", "answer.user_id", "users.id")
    .select("*", "users.username as endorse_name", "users.id as endorse_id")
    .where("answer.id", "=", answerId.answer_id);
}

function endorsePixel(obj, user, body) {
  if (obj[0].user_id !== user.id) {
    return pg("users")
      .where("users.id", "=", obj[0].user_id)
      .increment("pixel_count", 30);
  } else {
    console.log("Endorse Pixel Error");
  }
}

function endorse(obj) {
  return pg("answer").where("id", obj["answer_id"]).increment("votes", 1);
}

function getKudos(obj, name) {
  return pg("kudo").orderBy("created_at", "desc");
}

function getUsers(obj) {
  return pg("users").select("name", "id");
}

function kudoPoints(obj) {
  return pg("users").where("name", obj).increment("pixel_count", 20);
}

function giveKudo(obj, user) {
  return pg("kudo").insert({
    to: obj.to,
    body: obj.body,
    votes: obj.votes,
    to_user_id: obj.to_id,
    from: user.name,
  });
}

module.exports = {
  getAll,
  add,
  deleteQuestion,
  getAnswers,
  addAnswer,
  getCanvas,
  updateCanvas,
  endorse,
  joinEndorse,
  endorsePixel,
  getKudos,
  giveKudo,
  addPixel,
  subtractPixels,
  getUsers,
  kudoPoints,
};
