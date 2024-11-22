import express, {json, Request, Response, NextFunction} from 'express';
import {generateHashedPassword, loginAsync, processAuthorization, removeSession, validateToken} from "./lib/auth";
import {
  getDb,
  getDbDogFromIdAsync,
  getDbJobFromIdAsync,
  getDbUserFromIdAsync,
  getDbUserFromIdSafeAsync,
  getDbUserFromUsernameAsync,
  getDbDogsByOwnerIdAsync,
  getDbJobsByOwnerIdAsync,
  getDbJobsByDogIdAsync,
  getDbJobsByWalkerIdAsync,
  getDbJobsByStatusAsync
} from "./lib/db";
import {
  APIDog, APIJob,
  APIUser, DatabaseDogRow, DatabaseJobRow, DatabaseUserRow, JobStatus,
  ReqPatchUserIdBody, ReqPatchUserIdDogsIdBody,
  ReqPostAuthLoginBody,
  ReqPostAuthRegisterBody, ReqPostJobBody, ReqPostUserIdDogsBody
} from "./lib/definitions";
import jwt, {JwtPayload} from "jsonwebtoken";
import cookieParser from "cookie-parser";
import 'dotenv/config'

const app = express();
app.use(cookieParser(process.env.JWT_SIGNING_KEY));
app.use(json())

const rootUrl = "http://localhost:21923"

app.get("/", (req, res) => {
  res.status(200);
  res.send(JSON.stringify({
    "authEndpointRoot": `${rootUrl}/auth`,
    "jobsEndpointRoot": `${rootUrl}/jobs`,
    "usersEndpointRoot": `${rootUrl}/users`
  }))
})

//region Generic Middleware
async function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.signedCookies.token) {
    res.sendStatus(401);
    return;
  }
  const token = req.signedCookies.token;

  try {
    await validateToken(token);
    const tokenData = (jwt.decode(token) as JwtPayload).data as {id: string};
    const dbUser = await getDbUserFromIdAsync(tokenData.id);

    if (dbUser.is_owner) {
      res.locals.dbUser = dbUser;
      next()
    } else {
      console.error("User is not owner");
      res.sendStatus(401);
      return;
    }
  } catch (e: any) {
    console.error(e.message);
    res.sendStatus(e.status);
    return;
  }
}

async function requireWalker(req: Request, res: Response, next: NextFunction) {
  if (!req.signedCookies.token) {
    res.sendStatus(401);
    return;
  }
  const token = req.signedCookies.token;

  try {
    await validateToken(token);
    const tokenData = (jwt.decode(token) as JwtPayload).data as {id: string};
    const dbUser = await getDbUserFromIdAsync(tokenData.id);

    if (dbUser.is_walker) {
      res.locals.dbUser = dbUser;
      next()
    } else {
      console.error("User is not walker");
      res.sendStatus(401);
      return;
    }
  } catch (e: any) {
    console.error(e.message);
    res.sendStatus(e.status);
    return;
  }
}
//endregion

//region Authentication Endpoints (/auth)
app.post("/auth/login", async (req, res) => {
  const data = req.body as ReqPostAuthLoginBody;
  if (!data.username || !data.password) {
    res.sendStatus(400);
    return;
  }
  try {
    const token = await loginAsync(data.username, data.password);

    res.setHeader("Content-Type", "application/json")
    res.status(200);
    res.cookie("token", token, { signed: true, httpOnly: true, maxAge: 60*60*24*1000 })
    res.send(JSON.stringify({
      token
    }));
  } catch (e: any) {
    console.error(e.message);
    res.sendStatus(e.status);
    return;
  }
})

app.post("/auth/register", async (req, res) => {
  const data = req.body as ReqPostAuthRegisterBody;
  if (!data.username || !data.password || (!data.isOwner && !data.isWalker)) {
    res.sendStatus(400);
    console.error("was missing props")
    return;
  }

  const hashedPass = await generateHashedPassword(data.password);
  console.log(hashedPass)

  const db = getDb();
  const insertStmt = db.prepare("INSERT INTO users(username, password) VALUES ($username, $password)");
  let insertFailed = false;
  insertStmt.run({
    $username: data.username,
    $password: hashedPass
  }, (err) => {
    if (err) {
      res.sendStatus(400);
      console.log(err)
      insertFailed = true;
      return;
    }

    const rolesToUpdate = [];
    if (data.isOwner) rolesToUpdate.push("is_owner=1");
    if (data.isWalker) rolesToUpdate.push("is_walker=1");
    const updateStmt = db.prepare(`UPDATE users SET ${rolesToUpdate.join(", ")} WHERE username=$username`);
    updateStmt.run({
      $username: data.username
    }, async (err) => {
      if (err) {
        res.sendStatus(500);
        db.prepare("DELETE FROM users WHERE username=?").run(data.username)
        return;
      }

      const token = (await loginAsync(data.username, data.password))!!;
      res.setHeader("Content-Type", "application/json")
      res.status(200);
      res.cookie("token", token, { signed: true, httpOnly: true, maxAge: 60*60*24*1000 })
      res.send(JSON.stringify({
        token
      }));
    });
  })
})
//endregion

//region Job Endpoints (/jobs)
app.get("/jobs", async (req, res) => {
  // Handle cases where request has filters
  if (req.query.id) {
    try {
      const dbJob = await getDbJobFromIdAsync(req.query.id as string);
      const dbOwner = await getDbUserFromIdAsync(dbJob.owner_id.toString());
      const dbDog = await getDbDogFromIdAsync(dbJob.dog_id.toString());
      const dbWalker = dbJob.walker_id !== null ? await getDbUserFromIdSafeAsync(dbJob.walker_id.toString()) : undefined;

      res.status(200);
      res.setHeader("Content-Type", "application/json")
      res.send(JSON.stringify(createApiJobFromDbJob(dbJob, dbOwner, dbDog, dbWalker)))
    } catch (e: any) {
      console.log(e.message);
      res.sendStatus(e.status);
      return;
    }
  } else if (req.query.owner_id) {
    try {
      const dbJobs = await getDbJobsByOwnerIdAsync(req.query.owner_id as string);
      const dbOwner = await getDbUserFromIdAsync(req.query.owner_id as string);

      const apiJobs: APIJob[] = [];

      for (const dbJob of dbJobs) {
        const dbDog = await getDbDogFromIdAsync(dbJob.dog_id.toString());
        const dbWalker = dbJob.walker_id !== null ? await getDbUserFromIdSafeAsync(dbJob.walker_id.toString()) : undefined;

        apiJobs.push(createApiJobFromDbJob(dbJob, dbOwner, dbDog, dbWalker));
      }

      res.status(200);
      res.setHeader("Content-Type", "application/json")
      res.send(JSON.stringify(apiJobs))
    } catch (e: any) {
      console.log(e.message);
      res.sendStatus(e.status);
      return;
    }
  } else if (req.query.dog_id) {
    try {
      const dbJobs = await getDbJobsByDogIdAsync(req.query.dog_id as string);
      const dbDog = await getDbDogFromIdAsync(req.query.dog_id as string);

      const apiJobs: APIJob[] = [];

      for (const dbJob of dbJobs) {
        const dbOwner = await getDbUserFromIdAsync(dbJob.owner_id.toString());
        const dbWalker = dbJob.walker_id !== null ? await getDbUserFromIdSafeAsync(dbJob.walker_id.toString()) : undefined;

        apiJobs.push(createApiJobFromDbJob(dbJob, dbOwner, dbDog, dbWalker));
      }

      res.status(200);
      res.setHeader("Content-Type", "application/json")
      res.send(JSON.stringify(apiJobs))
    } catch (e: any) {
      console.log(e.message);
      res.sendStatus(e.status);
      return;
    }
  } else if (req.query.walker_id) {
    try {
      const dbJobs = await getDbJobsByWalkerIdAsync(req.query.walker_id as string);
      const dbWalker = await getDbUserFromIdAsync(req.query.walker_id as string);

      const apiJobs: APIJob[] = [];

      for (const dbJob of dbJobs) {
        const dbOwner = await getDbUserFromIdAsync(dbJob.owner_id.toString());
        const dbDog = await getDbDogFromIdAsync(dbJob.dog_id.toString());

        apiJobs.push(createApiJobFromDbJob(dbJob, dbOwner, dbDog, dbWalker));
      }

      res.status(200);
      res.setHeader("Content-Type", "application/json")
      res.send(JSON.stringify(apiJobs))
    } catch (e: any) {
      console.log(e.message);
      res.sendStatus(e.status);
      return;
    }
  } else if (req.query.status) {
    try {
      const dbJobs = await getDbJobsByStatusAsync(req.query.status as JobStatus);

      const apiJobs: APIJob[] = [];

      for (const dbJob of dbJobs) {
        const dbOwner = await getDbUserFromIdAsync(dbJob.owner_id.toString());
        const dbDog = await getDbDogFromIdAsync(dbJob.dog_id.toString());
        const dbWalker = await getDbUserFromIdSafeAsync(dbJob.walker_id.toString());

        apiJobs.push(createApiJobFromDbJob(dbJob, dbOwner, dbDog, dbWalker));
      }

      res.status(200);
      res.setHeader("Content-Type", "application/json")
      res.send(JSON.stringify(apiJobs))
    } catch (e: any) {
      console.log(e.message);
      res.sendStatus(e.status);
      return;
    }
  } else {
    res.sendStatus(400);
  }
})

app.post("/jobs", requireOwner, async (req, res) => {
  const data = req.body as ReqPostJobBody;
  if (data.dogId === undefined
    || data.pay === undefined
    || data.location === undefined
    || data.location.latitude === undefined
    || data.location.longitude === undefined) {
    res.sendStatus(400);
    return;
  }

  const db = getDb();
  const stmt = db.prepare(`INSERT INTO jobs(owner_id, dog_id, pay, location_lat, location_lng${data.deadline !== undefined ? ", deadline" : ""})
  VALUES($owner_id, $dog_id, $pay, $lat, $lng${data.deadline !== undefined ? ", $deadline" : ""})`)
  const values: any = {
    $owner_id: res.locals.dbUser.id,
    $dog_id: data.dogId,
    $pay: data.pay,
    $lat: data.location.latitude,
    $lng: data.location.longitude
  }
  if (data.deadline) values["$deadline"] = data.deadline;
  stmt.run(values, (err) => {
    if (err) {
      console.log(err);
      res.sendStatus(500);
    }

    res.sendStatus(204);
  })
})

app.get("/jobs/:id", async (req, res) => {
  try {
    const dbJob = await getDbJobFromIdAsync(req.params.id);
    const dbOwner = await getDbUserFromIdAsync(dbJob.owner_id.toString());
    const dbDog = await getDbDogFromIdAsync(dbJob.dog_id.toString());
    const dbWalker = dbJob.walker_id !== null ? await getDbUserFromIdSafeAsync(dbJob.walker_id.toString()) : undefined;

    const apiJob = createApiJobFromDbJob(dbJob, dbOwner, dbDog, dbWalker);

    res.status(200);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(apiJob));
  } catch (e: any) {
    console.log(e.message);
    res.sendStatus(e.status);
  }
})

app.delete("/jobs/:id", requireOwner, async (req, res) => {
  try {
    const dbJob = await getDbJobFromIdAsync(req.params.id);
    if (dbJob.status === "completed" || dbJob.status === "accepted") {
      res.sendStatus(403);
      return;
    }

    await processAuthorization(req.signedCookies.token, dbJob.owner_id.toString());

    const db = getDb();
    db.run(`DELETE FROM jobs WHERE id=$id`, {$id: req.params.id}, (err) => {
      if (err) {
        res.sendStatus(500);
        console.error(err);
        return;
      }
      res.sendStatus(204);
    })
  } catch (e: any) {
    console.log(e.message);
    res.sendStatus(e.status);
  }
})

app.post("/jobs/:id/accept", requireWalker, async (req, res) => {
  try {
    const dbJob = await getDbJobFromIdAsync(req.params.id);
    if (dbJob.status !== "posted" && dbJob.status !== "overdue") {
      res.sendStatus(403);
      return;
    }

    const db = getDb();
    db.run(`UPDATE jobs SET status='accepted',walker_id=${res.locals.dbUser.id} WHERE id=${dbJob.id}`, (err) => {
      if (err) {
        res.sendStatus(500);
        console.log(err);
        return;
      }

      res.sendStatus(204);
    })
  } catch (e: any) {
    res.sendStatus(e.status);
    console.error(e.message);
  }
})

app.post("/jobs/:id/complete", requireWalker, async (req, res) => {
  try {
    const dbJob = await getDbJobFromIdAsync(req.params.id);
    if (dbJob.walker_id !== res.locals.dbUser.id) {
      res.sendStatus(401);
      return;
    }
    if (dbJob.status !== "accepted") {
      res.sendStatus(403);
      return;
    }

    const db = getDb();
    db.run(`UPDATE jobs SET status='completed' WHERE id=${dbJob.id}`, (err) => {
      if (err) {
        res.sendStatus(500);
        console.log(err);
        return;
      }

      res.sendStatus(204);
    })
  } catch (e: any) {
    res.sendStatus(e.status);
    console.error(e.message);
  }
})

app.post("/jobs/:id/pay", requireOwner, async (req, res) => {
  try {
    const dbJob = await getDbJobFromIdAsync(req.params.id);
    if (dbJob.owner_id !== res.locals.dbUser.id) {
      res.sendStatus(401);
      return;
    }
    if (dbJob.status !== "completed") {
      res.sendStatus(403);
      return;
    }

    const db = getDb();
    db.run(`UPDATE jobs SET status='paid' WHERE id=${dbJob.id}`, (err) => {
      if (err) {
        res.sendStatus(500);
        console.log(err);
        return;
      }

      res.sendStatus(204);
    })
  } catch (e: any) {
    res.sendStatus(e.status);
    console.error(e.message);
  }
})
//endregion

async function elevatedUserRoute(req: Request, res: Response, next: NextFunction) {
  if (!req.signedCookies.token) {
    res.sendStatus(401);
    return;
  }
  try {
    await processAuthorization(req.signedCookies.token, req.params.user_id);
    next();
  } catch (e: any) {
    res.sendStatus(e.status);
    console.log(e.message)
  }
}

//region User Endpoints (/users)
app.get("/users", async (req, res) => {
  const queryParams = req.query;
  // Handle case where request has filters
  if (queryParams.username) {
    const username: string = queryParams.username as string;

    try {
      const user = await getDbUserFromUsernameAsync(username);

      const apiUser = createApiUserFromDbUser(user);

      res.setHeader("Content-Type", "application/json")
      res.status(200);
      res.send(JSON.stringify(apiUser));
    } catch (e: any) {
      console.error(e.message);
      res.sendStatus(e.status);
      return;
    }
  }
  else {
    if (!req.signedCookies.token) {
      res.sendStatus(401);
      return;
    }
    const token = req.signedCookies.token;

    try {
      await validateToken(token);
    } catch (e: any) {
      console.error(e.message);
      res.sendStatus(e.status);
      return;
    }

    const tokenData = (jwt.decode(token) as JwtPayload).data as {id: string};

    try {
      const user = await getDbUserFromIdAsync(tokenData.id);

      const apiUser = createApiUserFromDbUser(user);

      res.setHeader("Content-Type", "application/json")
      res.status(200);
      res.send(JSON.stringify(apiUser));
    } catch (e: any) {
      console.error(e.message);
      res.sendStatus(e.status);
      return;
    }
  }
})

app.get("/users/:user_id", async (req, res) => {
  try {
    const user = await getDbUserFromIdAsync(req.params.user_id);

    const apiUser = createApiUserFromDbUser(user);

    res.setHeader("Content-Type", "application/json")
    res.status(200);
    res.send(JSON.stringify(apiUser));
  } catch (e: any) {
    console.error(e.message);
    res.sendStatus(e.status);
    return;
  }
})

app.patch("/users/:user_id", elevatedUserRoute, async (req, res) => {
  try {
    const dbUser = await getDbUserFromIdAsync(req.params.user_id);

    const data = req.body as ReqPatchUserIdBody;
    if ((dbUser.is_walker === 0 && data.isOwner === false)
      || (dbUser.is_owner === 0 && data.isWalker === false)
      || (data.isWalker === false && data.isOwner === false)
      || (data.isOwner === undefined && data.isWalker === undefined)) {
      res.sendStatus(400);
      return;
    }

    const rolesToUpdate = [];
    if (data.isOwner !== undefined) rolesToUpdate.push(`is_owner=${data.isOwner ? 1 : 0}`);
    if (data.isWalker !== undefined) rolesToUpdate.push(`is_walker=${data.isWalker ? 1 : 0}`);
    const db = getDb();
    db.run(`UPDATE users SET ${rolesToUpdate.join(", ")} WHERE id=${req.params.user_id}`, (err) => {
      if (err) {
        res.sendStatus(500);
        return;
      }
      res.sendStatus(204);
    });
  } catch (e: any) {
    console.log(e.message);
    res.sendStatus(e.status);
    return;
  }
})

app.delete("/users/:user_id", elevatedUserRoute, async (req, res) => {
  try {
    const db = getDb();
    db.run(`DELETE FROM users WHERE id=${req.params.user_id}`, (err) => {
      if (err) {
        res.sendStatus(500);
        return;
      }
      res.sendStatus(204);
      removeSession(req.signedCookies.token);
    })
  } catch (e: any) {
    console.log(e.message);
    res.sendStatus(e.status);
    return;
  }
})

app.get("/users/:user_id/dogs", async (req, res) => {
  try {
    const owner = await getDbUserFromIdAsync(req.params.user_id);
    const dogs = await getDbDogsByOwnerIdAsync(req.params.user_id);

    const apiDogs = dogs.map((dbDog) => createApiDogFromDbDog(dbDog, owner));
    res.status(200);
    res.setHeader("Content-Type", "application/json")
    res.send(JSON.stringify(apiDogs));
  } catch (e: any) {
    console.log(e.message);
    res.sendStatus(e.status);
    return;
  }
})

app.post("/users/:user_id/dogs", elevatedUserRoute, async (req, res) => {
  try {
    const data = req.body as ReqPostUserIdDogsBody;

    if (data.age === undefined || data.breed === undefined || data.name === undefined) {
      res.sendStatus(400);
      return;
    }

    const db = getDb();

    const stmt = db.prepare("INSERT INTO dogs(owner_id, name, breed, age) VALUES ($owner_id, $name, $breed, $age)");
    stmt.run({
      $owner_id: req.params.user_id,
      $name: data.name,
      $breed: data.breed,
      $age: data.age
    }, (err) => {
      if (err) {
        res.sendStatus(500);
        console.error(err);
        return;
      }

      res.sendStatus(204);
    })
  } catch (e: any) {
    res.sendStatus(e.status);
    console.log(e.message);
  }
})

app.get("/users/:user_id/dogs/:id", async (req, res) => {
  try {
    const dbUser = await getDbUserFromIdAsync(req.params.user_id);
    const dbDog = await getDbDogFromIdAsync(req.params.id);

    const apiDog = createApiDogFromDbDog(dbDog, dbUser);

    res.setHeader("Content-Type", "application/json");
    res.status(200);
    res.send(JSON.stringify(apiDog));
  } catch (e: any) {
    console.log(e.message);
    res.sendStatus(e.status);
  }
})

app.patch("/users/:user_id/dogs/:id", elevatedUserRoute, async (req, res) => {
  const data = req.body as ReqPatchUserIdDogsIdBody;

  if (data.name === undefined && data.age === undefined && data.breed === undefined) {
    res.sendStatus(400);
    return;
  }

  try {
    await getDbDogFromIdAsync(req.params.id);
  } catch (e: any) {
    res.sendStatus(e.status);
    console.log(e.message);
    return;
  }

  const valuesToUpdate: string[] = [];
  const updatedValues: any = {$id: req.params.id};

  if (data.name !== undefined) {
    valuesToUpdate.push("name=$name");
    updatedValues["$name"] = data.name;
  }
  if (data.breed !== undefined) {
    valuesToUpdate.push("breed=$breed");
    updatedValues["$breed"] = data.breed;
  }
  if (data.age !== undefined) {
    valuesToUpdate.push("age=$age");
    updatedValues["$age"] = data.age;
  }

  const db = getDb();
  const stmt = db.prepare(`UPDATE dogs SET ${valuesToUpdate.join(", ")} WHERE id=$id`)
  stmt.run(updatedValues, (err) => {
    if (err) {
      res.sendStatus(500);
      console.error(err);
      return;
    }

    res.sendStatus(204);
  })
})

app.delete("/users/:user_id/dogs/:id", elevatedUserRoute, async (req, res) => {
  try {
    await getDbDogFromIdAsync(req.params.id);
  } catch (e: any) {
    res.sendStatus(e.status);
    console.log(e.message);
    return;
  }

  const db = getDb();
  const stmt = db.prepare("DELETE FROM dogs WHERE id=$id");
  stmt.run({
    $id: req.params.id
  }, (err) => {
    if (err) {
      res.sendStatus(500);
      console.error(err);
      return;
    }

    res.sendStatus(204);
  })
})
//endregion

function createApiUserFromDbUser(dbUser: DatabaseUserRow) {
  return {
    id: dbUser.id,
    username: dbUser.username,
    isWalker: dbUser.is_walker === 1,
    isOwner: dbUser.is_owner === 1,
    userUrl: `${rootUrl}/users/${dbUser.id}`,
    dogsUrl: `${rootUrl}/users/${dbUser.id}/dogs`
  } as APIUser
}

function createApiDogFromDbDog(dbDog: DatabaseDogRow, dbOwner: DatabaseUserRow) {
  return {
    id: dbDog.id,
    owner: createApiUserFromDbUser(dbOwner),
    name: dbDog.name,
    breed: dbDog.breed,
    age: dbDog.age,
    dogUrl: `${rootUrl}/users/${dbOwner.id}/dogs/${dbDog.id}`
  } as APIDog
}

function createApiJobFromDbJob(dbJob: DatabaseJobRow, dbOwner: DatabaseUserRow, dbDog: DatabaseDogRow, dbWalker: DatabaseUserRow | undefined) {
  return {
    id: dbJob.id,
    owner: createApiUserFromDbUser(dbOwner),
    dog: createApiDogFromDbDog(dbDog, dbOwner),
    walker: dbWalker === undefined ? undefined : createApiUserFromDbUser(dbWalker),
    status: dbJob.status,
    pay: dbJob.pay,
    location: {
      latitude: dbJob.location_lat,
      longitude: dbJob.location_lng,
    },
    deadline: dbJob.deadline,
    jobUrl: `${rootUrl}/jobs/${dbJob.id}`
  } as APIJob
}

app.listen(21923, () => {
  const db = getDb();
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    is_owner INTEGER NOT NULL DEFAULT 0,
    is_walker INTEGER NOT NULL DEFAULT 0
  );`)
  db.run(`CREATE TABLE IF NOT EXISTS dogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    owner_id INTEGER NOT NULL,
    name TEXT,
    breed TEXT,
    age INTEGER,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );`)
  db.run(`CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
    owner_id INTEGER NOT NULL,
    dog_id INTEGER NOT NULL,
    walker_id INTEGER,
    status TEXT NOT NULL DEFAULT 'posted',
    pay REAL NOT NULL,
    location_lat REAL NOT NULL,
    location_lng REAL NOT NULL,
    deadline INTEGER,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    FOREIGN KEY (dog_id) REFERENCES dogs(id),
    FOREIGN KEY (walker_id) REFERENCES users(id)
  );`)
  console.log("Server is ready on port 21923!")
})