import sqlite3, {Database} from "sqlite3";
import {DatabaseDogRow, DatabaseJobRow, DatabaseUserRow, JobStatus} from "./definitions";

let db: Database | undefined = undefined;

export function getDb() {
  if (!db) db = new sqlite3.Database("./db.sqlite");
  return db;
}

export async function getDbUserFromIdAsync(id: string): Promise<DatabaseUserRow> {
  const db = getDb();
  let dbUser: DatabaseUserRow | undefined = undefined;
  const stmt = db.prepare("SELECT * FROM users WHERE id=$id");
  return new Promise((resolve, reject) => {
    const timeOut = setTimeout(() => reject({status: 404, message: "User not found"}), 10000);
    stmt.get({
      $id: id
    }, (err, row) => {
      if (err) {
        console.error(err);
        reject({status: 500, message: err});
        return;
      }
      if (row === undefined) {
        reject({status: 404, message: "No user found"})
      }
      clearTimeout(timeOut);
      resolve(row as DatabaseUserRow);
    })
  });
}

export async function getDbUserFromIdSafeAsync(id: string): Promise<DatabaseUserRow | undefined> {
  const db = getDb();
  let dbUser: DatabaseUserRow | undefined = undefined;
  const stmt = db.prepare("SELECT * FROM users WHERE id=$id");
  return new Promise((resolve, reject) => {
    const timeOut = setTimeout(() => resolve(undefined), 10000);
    stmt.get({
      $id: id
    }, (err, row) => {
      if (err) {
        console.error(err);
        resolve(undefined);
        return;
      }
      if (row === undefined) {
        resolve(undefined);
      }
      clearTimeout(timeOut);
      resolve(row as DatabaseUserRow);
    })
  });
}

export async function getDbUserFromUsernameAsync(username: string): Promise<DatabaseUserRow> {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE username=$username");
  return new Promise((resolve, reject) => {
    const timeOut = setTimeout(() => reject({status: 404, message: "User not found"}), 10000);
    stmt.get({
      $username: username
    }, (err, row) => {
      if (err) {
        console.error(err);
        reject({status: 500, message: err});
        return;
      }
      if (row === undefined) {
        reject({status: 404, message: "No user found"});
        return;
      }
      clearTimeout(timeOut);
      resolve(row as DatabaseUserRow);
    })
  });
}

export async function getDbUserFromUsernameSafeAsync(username: string): Promise<DatabaseUserRow | undefined> {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE username=$username");
  return new Promise((resolve, reject) => {
    const timeOut = setTimeout(() => resolve(undefined), 10000);
    stmt.get({
      $username: username
    }, (err, row) => {
      if (err) {
        console.error(err);
        resolve(undefined)
        return;
      }
      if (row === undefined) {
        resolve(undefined);
        return;
      }
      clearTimeout(timeOut);
      resolve(row as DatabaseUserRow);
    })
  });
}

export async function getDbDogFromIdAsync(id: string): Promise<DatabaseDogRow> {
  const db = getDb();
  let dbDog: DatabaseDogRow | undefined = undefined;
  const stmt = db.prepare("SELECT * FROM dogs WHERE id=$id");
  return new Promise((resolve, reject) => {
    const timeOut = setTimeout(() => reject({status: 404, message: "Dog not found"}), 10000);
    stmt.get({
      $id: id
    }, (err, row) => {
      if (err) {
        console.error(err);
        reject({status: 500, message: err});
        return;
      }
      if (row === undefined) {
        reject({status: 404, message: "No dog found"})
      }
      clearTimeout(timeOut);
      resolve(row as DatabaseDogRow);
    })
  });
}

export async function getDbDogsByOwnerIdAsync(id: string): Promise<DatabaseDogRow[]> {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM dogs INNER JOIN users user on user.id = dogs.owner_id WHERE user.id=$id");
  return new Promise((resolve, reject) => {
    const timeOut = setTimeout(() => reject({status: 404, message: "No dogs found"}), 10000);
    stmt.all({
      $id: id
    }, (err, rows) => {
      if (err) {
        console.error(err);
        reject({status: 500, message: err});
        return;
      }
      if (rows === undefined) {
        resolve([])
        return;
      }
      clearTimeout(timeOut);
      resolve(rows as DatabaseDogRow[]);
    })
  })
}

export async function getDbJobFromIdAsync(id: string): Promise<DatabaseJobRow> {
  const db = getDb();
  let dbDog: DatabaseJobRow | undefined = undefined;
  const stmt = db.prepare("SELECT * FROM jobs WHERE id=$id");
  return new Promise((resolve, reject) => {
    const timeOut = setTimeout(() => reject({status: 404, message: "Job not found"}), 10000);
    stmt.get({
      $id: id
    }, (err, row) => {
      if (err) {
        console.error(err);
        reject({status: 500, message: err});
        return;
      }
      if (row === undefined) {
        reject({status: 404, message: "No job found"})
      }
      clearTimeout(timeOut);
      resolve(row as DatabaseJobRow);
    })
  });
}

export async function getDbJobsByOwnerIdAsync(id: string): Promise<DatabaseJobRow[]> {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM jobs INNER JOIN users user on user.id = jobs.owner_id WHERE user.id=$id");
  return new Promise((resolve, reject) => {
    const timeOut = setTimeout(() => reject({status: 404, message: "No jobs found"}), 10000);
    stmt.all({
      $id: id
    }, (err, rows) => {
      if (err) {
        console.error(err);
        reject({status: 500, message: err});
        return;
      }
      if (rows === undefined) {
        resolve([])
        return;
      }
      clearTimeout(timeOut);
      resolve(rows as DatabaseJobRow[]);
    })
  })
}

export async function getDbJobsByDogIdAsync(id: string): Promise<DatabaseJobRow[]> {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM jobs INNER JOIN dogs dog on dog.id = jobs.dog_id WHERE dog.id=$id");
  return new Promise((resolve, reject) => {
    const timeOut = setTimeout(() => reject({status: 404, message: "No jobs found"}), 10000);
    stmt.all({
      $id: id
    }, (err, rows) => {
      if (err) {
        console.error(err);
        reject({status: 500, message: err});
        return;
      }
      if (rows === undefined) {
        resolve([]);
        return;
      }
      clearTimeout(timeOut);
      resolve(rows as DatabaseJobRow[]);
    })
  })
}

export async function getDbJobsByWalkerIdAsync(id: string): Promise<DatabaseJobRow[]> {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM jobs INNER JOIN users user on user.id = jobs.walker_id WHERE user.id=$id");
  return new Promise((resolve, reject) => {
    const timeOut = setTimeout(() => reject({status: 404, message: "No jobs found"}), 10000);
    stmt.all({
      $id: id
    }, (err, rows) => {
      if (err) {
        console.error(err);
        reject({status: 500, message: err});
        return;
      }
      if (rows === undefined) {
        resolve([])
        return;
      }
      clearTimeout(timeOut);
      resolve(rows as DatabaseJobRow[]);
    })
  })
}

export async function getDbJobsByStatusAsync(status: JobStatus): Promise<DatabaseJobRow[]> {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM jobs WHERE status=$status");
  return new Promise((resolve, reject) => {
    const timeOut = setTimeout(() => reject({status: 404, message: "No jobs found"}), 10000);
    stmt.all({
      $status: status
    }, (err, rows) => {
      if (err) {
        console.error(err);
        reject({status: 500, message: err});
        return;
      }
      if (rows === undefined) {
        resolve([])
        return;
      }
      clearTimeout(timeOut);
      resolve(rows as DatabaseJobRow[]);
    })
  })
}
