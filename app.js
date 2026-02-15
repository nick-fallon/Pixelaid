const express = require("express");
const path = require("path");
const favicon = require("serve-favicon");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const query = require("./db/query");
const session = require("express-session");
const passport = require("passport");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const pg = require("./db/knex");

require("dotenv").config();
require("./helpers/passport");

const index = require("./routes/index");
const users = require("./routes/users");
const auth = require("./routes/auth");
const signup = require("./routes/signup");

const app = express();
const port = process.env.PORT || 5001;
const saltRounds = 10;
const sseClients = new Set();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("index", { error: "Incorrect username or password" });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/canvas",
    failureRedirect: "/login",
  }),
);

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    res.redirect("/");
  });
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/signuperror", (req, res) => {
  res.render("signup", { error: "USERNAME/EMAIL ALREADY EXISTS" });
});

app.post("/signup", (req, res) => {
  bcrypt.genSalt(saltRounds).then((salt) => {
    bcrypt
      .hash(req.body.password, salt)
      .then((hash) => {
        return pg("users").insert({
          username: req.body.username,
          password: hash,
          email: req.body.email,
          name: req.body.name,
          pixel_count: 31,
        });
      })
      .catch((err) => {
        res.redirect("/signuperror");
      })
      .then(() => {
        res.redirect("/");
      });
  });
});

var currentUser = { name: "Guest", pixel_count: 0 };

function parseUpdatePayload(body) {
  try {
    if (!body || typeof body.json !== "string") return null;
    let parsed = JSON.parse(body.json);
    if (!parsed || !parsed.section) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function normalizeSectionForBroadcast(section) {
  let normalized = {
    id: Number(section.id),
    canvas_id: Number(section.canvas_id) || 1,
  };
  for (let i = 0; i < 16; i++) {
    normalized["row_" + i] =
      section["row_" + i] || section[i] || "E".repeat(16);
  }
  return normalized;
}

function broadcastEvent(type, data) {
  let payload = `data: ${JSON.stringify({ type, ...data })}\n\n`;
  for (let client of sseClients) {
    try {
      client.write(payload);
    } catch (error) {
      sseClients.delete(client);
    }
  }
}

function sendUpdateResponse(req, res, status, body) {
  let accepts = req.get("accept") || "";
  if (req.xhr || accepts.includes("application/json")) {
    return res.status(status).json(body);
  }
  if (status >= 400) {
    return res.status(status).send(body && body.error ? body.error : "Request failed");
  }
  return res.redirect("/canvas");
}

app.get("/canvas", (req, res) => {
  currentUser = req.user || { name: "Guest", pixel_count: 0 };
  query.getCanvas().then((data) => {
    res.render("canvas", { data, currentUser });
  });
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  res.write("retry: 1000\n\n");
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

//this is to pass the canvas db to canvas.js
app.get("/data", (req, res) => {
  query.getCanvas().then((data) => {
    res.json(data);
  });
});

app.post("/previewPixel", (req, res) => {
  let payload;
  try {
    payload = JSON.parse(req.body.json || "{}");
  } catch (error) {
    return res.status(400).json({ error: "Invalid preview payload" });
  }

  if (!payload || !payload.section_id || !payload.row_key || payload.x === undefined || !payload.char) {
    return res.status(400).json({ error: "Missing preview payload fields" });
  }

  broadcastEvent("canvas_preview", {
    section_id: Number(payload.section_id),
    row_key: String(payload.row_key),
    x: Number(payload.x),
    char: String(payload.char),
  });
  res.status(200).json({ ok: true });
});

app.post("/previewReset", (req, res) => {
  let payload;
  try {
    payload = JSON.parse(req.body.json || "{}");
  } catch (error) {
    return res.status(400).json({ error: "Invalid preview reset payload" });
  }

  if (!payload || !payload.section) {
    return res.status(400).json({ error: "Missing reset section payload" });
  }

  let section = normalizeSectionForBroadcast(payload.section);
  broadcastEvent("canvas_preview_reset", { section });
  res.status(200).json({ ok: true });
});

//update the canvas DB
app.post("/updateCanvas", (req, res) => {
  let parsedPayload = parseUpdatePayload(req.body);
  if (!parsedPayload) {
    return sendUpdateResponse(req, res, 400, { error: "Invalid canvas update payload" });
  }
  let broadcastSection = normalizeSectionForBroadcast(parsedPayload.section);

  query
    .updateCanvas(req.body)
    .then(() => {
      // Allow guest updates without crashing when no authenticated user exists.
      if (!req.user) {
        return null;
      }
      return query
        .subtractPixels(req.body, req.user.id, req.user.pixel_count)
        .catch(() => null);
    })
    .then(() => {
      broadcastEvent("canvas_update", { section: broadcastSection });
      sendUpdateResponse(req, res, 200, { ok: true });
    })
    .catch((error) => {
      console.error("updateCanvas error:", error);
      sendUpdateResponse(req, res, 500, { error: "Unable to update canvas" });
    });
});

app.post("/clearCanvas", (req, res) => {
  query
    .clearCanvas()
    .then((sections) => {
      broadcastEvent("canvas_cleared", { sections });
      res.status(200).json({ ok: true });
    })
    .catch((error) => {
      console.error("clearCanvas error:", error);
      res.status(500).json({ error: "Unable to clear canvas" });
    });
});

app.get("/questions", (req, res) => {
  query.getAll().then((data) => {
    res.render("questions", { data });
  });
});

app.post("/add-questions", (req, res) => {
  query
    .add(req.body)
    .then(() => {
      res.redirect("/questions");
    })
    .catch((error) => {
      res.send(error);
    });
});

app.get("/delete/:id", (req, res) => {
  query.deleteQuestion(req.params.id).then(() => {
    res.redirect("/questions");
  });
});

app.get("/answer/:id", (req, res) => {
  query.getAnswers(req.params.id).then((data) => {
    res.render("answer", { data, title: data[0].title, body: data[0].body });
  });
});

app.get("/answerpixel/:id", (req, res) => {
  let answerId = req.params.id;
  let username = req.user;
  query.addPixel(req.user).then((data) => {
    res.redirect("/answer/" + answerId);
  });
});

app.post("/addAnswer/:id", (req, res) => {
  req.body.question_id = req.params.id;
  let answerId = req.params.id;
  req.body["votes"] = 0;
  query.addAnswer(req.body, req.user).then(() => {
    res.redirect("/answerpixel/" + answerId);
  });
});

app.get("/answererror", (req, res) => {
  res.render("answer", { error: "You can't endorse your own answer" });
});

app.post("/endorse/:id", (req, res) => {
  let answerId = req.params.id;
  let user = req.user;
  let body = req.body;

  query.endorse(req.body).then((obj) => {
    query.joinEndorse(body).then((join) => {
      query.endorsePixel(join, user, body).then((data) => {
        res.redirect("/answer/" + answerId);
      });
    });
  });
});

//renders the kudos page, with updated kudos
app.get("/kudos", (req, res) => {
  query.getKudos(req.body).then((data) => {
    data.name = currentUser.name;
    query.getUsers(req.body).then((user) => {
      res.render("kudos", { user, data });
    });
  });
});

var kudo = "name";
app.get("/kudoPoints", (req, res) => {
  query.kudoPoints(kudo).then((data) => {
    res.redirect("/kudos");
  });
});

app.post("/giveKudo", (req, res) => {
  kudo = req.body.to;
  query.giveKudo(req.body, req.user).then((data) => {
    res.redirect("/kudoPoints");
  });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error");
});

app.listen(port, console.log("listening on " + port));

module.exports = app;
