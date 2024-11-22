import express, {json} from "express";
import {Database} from "sqlite3";
import {Booking} from "./models/bookings";
import * as path from "node:path";
import {BookingFetchRequest} from "./models/requests";

// Setup SQLite
const db = new Database("./db.sqlite");

// language=SQLite
db.run(`CREATE TABLE IF NOT EXISTS bookings(
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
        reason TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL)`)

// Setup server
const server = express();
server.use(json());

server.use('/', express.static(path.join(__dirname, "..", "public")))

server.get("/calendar/bookings", (req, res) => {
  // Cast the request body as a BookingFetchRequest
  const bookingReq = req.query as unknown as BookingFetchRequest;

  const missing_properties: string[] = [];
  if (!bookingReq.startDate) missing_properties.push("startDate");
  if (!bookingReq.endDate) missing_properties.push("endDate");

  if (missing_properties.length !== 0) {
    res.status(400);
    res.send({
      error: {
        message: "The booking request is missing information!",
        details: {
          missing_properties
        }
      }
    })
    return;
  }

  if (bookingReq.endDate < bookingReq.startDate) {
    res.status(400);
    res.send({
      error: {
        message: "Unable to time travel! Check your starting and end dates."
      }
    })
    return;
  }

  // Convert timestamps to very start and very end
  const startDate = new Date(parseInt(bookingReq.startDate));
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(parseInt(bookingReq.endDate));
  endDate.setDate(endDate.getDate() + 1);
  endDate.setHours(0, 0, 0, 0);
  endDate.setMilliseconds(-1);

  // Fetch bookings within time period in database
  const bookings: Booking[] = [];
  const stmt = db.prepare("SELECT * FROM bookings WHERE start_time >= $startTime AND end_time <= $endTime");
  stmt.all({
    $startTime: startDate.getTime(),
    $endTime: endDate.getTime()
  }, (err, result) => {
    if (err) {
      res.sendStatus(500);
      console.log(err);
      return;
    }

    const rows = result as {id: number, start_time: number, end_time: number, reason: string}[]
    
    for (const row of rows) {
      bookings.push({
        id: row.id,
        start: new Date(row.start_time),
        end: new Date(row.end_time),
        reason: row.reason
      })
    }

    res.status(200);
    res.send({
      bookings
    })
  });
})

server.post("/calendar/bookings", (req, res) => {
  // Cast the request body as a Booking
  const booking = req.body as Booking;

  console.log(req.body)

  // Ensure all required properties are fulfilled, respond with
  // A 400 if there are any missing properties
  const missing_properties: string[] = [];
  if (!booking.start) missing_properties.push("start");
  if (!booking.end) missing_properties.push("end");
  if (!booking.reason) missing_properties.push("reason");
  if (missing_properties.length !== 0) {
    res.status(400);
    res.send({
      error: {
        message: "The booking you have sent is missing information!",
        details: {
          missing_properties
        }
      },
    })
    return;
  }

  if (booking.end < booking.start) {
    res.status(400);
    res.send({
      error: {
        message: "Unable to time travel! Check your start and end dates."
      }
    });
    return;
  }

  // Insert the valid booking into the database
  const stmt = db.prepare(`INSERT INTO bookings(reason, start_time, end_time) VALUES (?, ?, ?)`)
  stmt.run(booking.reason, booking.start, booking.end)
  stmt.finalize((err) => {
    if (err) {
      res.status(500);
      res.send();
      console.log(err);
    } else {
      res.status(204);
      res.send();
    }
  })
})

server.delete("/calendar/bookings/:id", (req, res) => {
  const bookingId = req.params.id;
  const stmt = db.prepare('DELETE FROM bookings WHERE id=$id');
  stmt.run({
    $id: parseInt(bookingId)
  }, (err: Error) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
      return;
    }
    
    res.sendStatus(204);
  })
})

server.listen(21923, () => {
  console.log("Backend is now ready and listening on port 21923!")
});