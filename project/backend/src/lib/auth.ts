import bcrypt from "bcrypt";
import jwt, {JwtPayload} from "jsonwebtoken";
import {getDb, getDbUserFromIdAsync, getDbUserFromUsernameAsync} from "./db";
import 'dotenv/config'

const sessions: string[] = []

export async function generateHashedPassword(plaintextPass: string) {
  return await bcrypt.hash(plaintextPass, 10);
}

export async function loginAsync(username: string, password: string) {
  return new Promise<string>(async (resolve, reject) => {
    try {
      const dbUser = await getDbUserFromUsernameAsync(username);

      bcrypt.compare(password, dbUser.password)
        .then((success) => {
          if (!success) {
            reject({status: 401, message: "Passwords do not match"});
            return;
          }

          const token: string = jwt.sign({
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24),
            data: {
              id: dbUser.id,
            }
            // @ts-ignore
          }, process.env.JWT_SIGNING_KEY)

          sessions.push(token);
          resolve(token);
        })
        .catch();
    } catch (e: any) {
      if (e.status === 404) {
        e.status = 401;
      }
      reject(e)
    }
  });
}

export async function validateToken(token: string) {
  return new Promise<boolean>((resolve, reject) => {
    const timeOut = setTimeout(() => reject({status: 500, message: "Timed out"}), 10000);
    // @ts-ignore
    jwt.verify(token, process.env.JWT_SIGNING_KEY, (err, decoded) => {
      if (err) {
        console.error(err);
        reject({status: 401, message: "Invalid token"});
        return;
      }
      const payload = decoded as JwtPayload;
      if (!sessions.includes(token)) {
        reject({status: 401, message: "Unknown session token"});
        return;
      }
      if (!payload.exp) {
        reject({status: 401, message: "Invalid session token"});
        return;
      }
      resolve(true);
      clearTimeout(timeOut);
    })
  });
}

export async function processAuthorization(token: string, userId: string): Promise<boolean> {
  return new Promise<boolean>(async (resolve, reject) => {
    const timeOut = setTimeout(() => reject({status:500, message: "Timed out"}), 10000)
    getDbUserFromIdAsync(userId).then(async () => {
      validateToken(token).then(() => {
        const tokenData = (jwt.decode(token) as JwtPayload).data as {id: string};
        if (parseInt(tokenData.id) !== parseInt(userId)) {
          reject({status: 401, message: "ids do not match"})
          return;
        }

        clearTimeout(timeOut);
        resolve(true);
      }).catch(reject);
    }).catch(() => reject({status: 404, message: "Unknown user"}));
  })
}

export function removeSession(token: string) {
  sessions.splice(sessions.indexOf(token), 1);
}