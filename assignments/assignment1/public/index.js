let currentDate = new Date(Date.now());
const now = new Date(Date.now());
const months = ["January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"];
const shortDays = ["SUN", "MON", "TUE", "WED", "THUR", "FRI", "SAT"];

/**
 * String variable representing the current calendar view.
 * "m" represents month view, while "d" represents day view
 * @type {"m" | "d"}
 */
let view = "d"

/**
 * Creates and presents a new error modal
 * @param {string} errorMessage The message to give the user with this modal
 * @param {boolean} allowExit Adds a button that closes the modal if set to true
 */
function showErrorModal(errorMessage, allowExit) {
    const modalText = `<dialog id="error-modal" class="error-modal">
        <div class="error-modal-header">
            <span class="material-symbols-outlined">error</span>
            <span class="error-modal-header-text">Error</span>
        </div>
        <div class="error-modal-content">
            <span class="error-modal-msg">${errorMessage}</span>
            ${allowExit && `<div>
                    <button id="close-modal" onclick="closeModal('error-modal')"
                            class="float-right">Close</button>
                </div>
            `}
        </div>
    </dialog>`

    /** @type {HTMLTemplateElement} */
    let templateEl = document.createElement('template');
    templateEl.innerHTML = modalText;

    /** @type {HTMLDialogElement} */
    let modalEl = templateEl.content.firstElementChild;
    document.documentElement.append(modalEl);
    modalEl.showModal();
}

/**
 * Creates and presents a new modal for the selected booking
 * @param {Event} event
 * @param {{id: number, reason: string, start: Date, end: Date}} booking The data associated with the booking
 */
function showBookingModal(event, booking) {
    event.stopImmediatePropagation();
    const modalText = `<dialog id="event-modal">
        <h1 class="event-modal-header">Event Details</h1>
        <div class="event-modal-details">
            <div>
                <h2 class="event-modal-detail-header">Event Name</h2>
                <span>${booking.reason}</span>
            </div>
            <div>
                <h2 class="event-modal-detail-header">Start</h2>
                <span>${generateDateTimeString(new Date(booking.start))}</span>
            </div>
            <div>
                <h2 class="event-modal-detail-header">End</h2>
                <span>${generateDateTimeString(new Date(booking.end))}</span>
            </div>
        </div>
        <div class="event-modal-button-container">
            <button id="delete-event" onclick="deleteEventFromModal(${booking.id}, 'event-modal')">Delete Event</button>
            <button id="close-event-modal" onclick="closeModal('event-modal')">Close Info</button>
        </div>
    </dialog>`;

    /** @type {HTMLTemplateElement} */
    let templateEl = document.createElement('template');
    templateEl.innerHTML = modalText;

    /** @type {HTMLDialogElement} */
    let modalEl = templateEl.content.firstElementChild;
    document.documentElement.append(modalEl);
    modalEl.showModal();

    /**
     * Generated a date and time string with the provided Date
     * @param {Date} date The date to generate a date and time string for
     */
    function generateDateTimeString(date) {
        return `${months[date.getMonth()]} ${date.getDate()}${generateOrdinalPostfix(date.getDate())}, ${date.getFullYear()} - ${date.getHours()}:${date.getMinutes().toString().padEnd(2, '0')}`
    }
}

/**
 * Show the modal to create a new event
 * @param event The click event
 */
async function showCreateBookingModal(event) {
    event.stopImmediatePropagation();
    const modalText = `<dialog id="create-booking-modal" class="modal">
        <form method="dialog" id="new-event-form" onsubmit="return createBooking('new-event-form')" class="dialog-form">
            <h1>Add a new event</h1>
            <div class="form-inputs-container">
                <label for="new-event-start">Start</label><br>
                <input type="datetime-local" name="new-event-start" id="new-event-start" required><br>
                <label for="new-event-end">End</label><br>
                <input type="datetime-local" name="new-event-end" id="new-event-end" required><br>
                <label for="new-event-reason">Reason</label><br>
                <input type="text" name="Reason" id="new-event-reason" required><br>
            </div>
            <div class="dialog-button-container">
                <button onclick="closeModal('create-booking-modal')" class="button-neutral">Cancel</button>
                <button type="submit" class="button-accent">Add</button>
            </div>
        </form>
    </dialog>`

    /** @type {HTMLTemplateElement} */
    let templateEl = document.createElement('template');
    templateEl.innerHTML = modalText;

    /** @type {HTMLDialogElement} */
    let modalEl = templateEl.content.firstElementChild;
    document.documentElement.append(modalEl);
    modalEl.showModal();
}

/**
 * Hides and removes a modal from the DOM
 * @param {string} elementId The modal's ID
 */
function closeModal(elementId) {
    /** @type {HTMLDialogElement} */
    const modal = document.getElementById(elementId);
    if (!modal) return;
    modal.close();
    modal.remove();
}

/**
 * Attempt to create a booking from a form
 * @param formId The form containing booking info
 */
function createBooking(formId) {
    /** @type HTMLFormElement */
    const formEl = document.getElementById(formId);

    /** @type HTMLInputElement */
    const startDateEl = formEl.elements["new-event-start"];
    const startDate = new Date(startDateEl.value);

    /** @type HTMLInputElement */
    const endDateEl = formEl.elements["new-event-end"];
    const endDate = new Date(endDateEl.value);

    if (endDate < startDate) {
        showErrorModal("Unable to time travel! The end date cannot be earlier than the start date!", true);
        return false;
    }

    /** @type HTMLInputElement */
    const reasonEl = formEl.elements["new-event-reason"];
    const reason = reasonEl.value;

    return fetch("http://localhost:21923/calendar/bookings", {
        headers: {
            "Content-Type": "application/json"
        },
        method: "post",
        body: JSON.stringify({
            start: startDate.getTime(),
            end: endDate.getTime(),
            reason
        })
    }).then(async (res) => {
        const resBody = await res.json();
        if (!res.ok) {
            console.error(resBody);
            showErrorModal(resBody.error.message, true);
            return false;
        }
        return true;
    }).then((success) => {
        if (success) {
            closeModal("create-booking-modal");
        }
        return success;
    })
}

/**
 * Fetches the bookings from the server within a certain time period
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {{id: number, start: Date, end: Date, reason: string}[] | undefined}
 */
async function fetchBookings(startDate, endDate) {
    // Load bookings from database for given time range
    const booking_url = `http://localhost:21923/calendar/bookings?startDate=${startDate.getTime()}&endDate=${endDate.getTime()}`
    const response = await fetch(booking_url);

    let fetchedBookings = true;
    if (!response.ok) {
        console.log(await response.json())
        showErrorModal(`An error has occurred while fetching the calendar bookings from the database.
                                Please refer to the console for more information.`, false)
        fetchedBookings = false;
    }

    /** @type{ {id: number, start: string, end: string, reason: string}[] } */
    const bookings = (await response.json()).bookings;

    console.log(bookings)

    if (fetchedBookings) {
        console.log("Fetched bookings:")
        console.log(JSON.stringify(bookings))
        return bookings.map((booking) => {return {
            id: booking.id,
            start: new Date(booking.start),
            end: new Date(booking.end),
            reason: booking.reason
        }});

    } else {
        return undefined;
    }
}

/**
 * Fills in the month calendar view with the appropriate data
 * @param {Date} date
 */
async function generateMonthCalendar(date) {
    // Set month and year text
    const timespanEl = document.getElementById("current-timespan");
    timespanEl.innerHTML = `${months[date.getMonth()]} ${date.getFullYear()}`

    // Find date that matches the Sunday of the earliest week of the current month
    const workingDate = new Date(date);
    workingDate.setDate(1);
    workingDate.setDate(-workingDate.getDay() + 1);

    // Calculate the calendar's start and end
    const calendarStart = new Date(workingDate.getTime())
    const calendarEnd = new Date(calendarStart.getTime());
    calendarEnd.setDate(calendarEnd.getDate() + 35)

    // Fetch bookings
    const bookings = await fetchBookings(calendarStart, calendarEnd);
    const foundBookings = bookings !== undefined;

    // Get the calendar grids and fill the dates in
    const calendar = document.getElementById("calendar-month-view");
    calendar.innerHTML = "";

    for (let i = 0; i < 35; i++) {
        let outOfRange = workingDate.getMonth() !== date.getMonth();
        const divText = `<div class="calendar-square${outOfRange ? " out-of-range-date" : ""}" onclick="selectDay(${workingDate.getDate()}, ${workingDate.getMonth() - date.getMonth()})">
            ${i / 7 < 1 ?
            `<div class="calendar-square-header">
                <span class="day-number number-header${workingDate.getDate() === now.getDate() && workingDate.getMonth() === now.getMonth() && workingDate.getFullYear() === now.getFullYear() ? " day-current" : ""}">${workingDate.getDate().toString()}</span>
                <span class="weekday-header">${shortDays[workingDate.getDay()]}</span>
                <span class="flex-spacer">&nbsp;</span>
            </div>` :
            `<span class="day-number${workingDate.getDate() === now.getDate() && workingDate.getMonth() === now.getMonth() && workingDate.getFullYear() === now.getFullYear() ? " day-current" : ""}">${workingDate.getDate().toString()}</span>`}
        </div>`

        /** @type {HTMLTemplateElement} */
        const templateEl = document.createElement('template');
        templateEl.innerHTML = divText;

        const divEl = templateEl.content.firstElementChild;
        calendar.append(divEl);

        // Look for events and generate if they exist
        if (foundBookings) {
            let events = 0;
            for (const booking of bookings) {
                if (booking.start.getDate() === workingDate.getDate() && booking.start.getMonth() === workingDate.getMonth() && booking.start.getFullYear() === workingDate.getFullYear()) {
                    if (events >= 3) {
                        events++;
                        continue;
                    }
                    divEl.innerHTML += generateEventElements(booking);
                    events++;
                }
            }
            if (events > 3) {
                divEl.innerHTML += `<span class="event-overflow">+${events - 3} more...</span>`;
            }
        }

        workingDate.setDate(workingDate.getDate() + 1);

        function generateEventElements(booking) {
            return `<div id="event-id-${booking.id}" class="event" onclick='showBookingModal(event, ${JSON.stringify(booking)})'>
                <div class="indicator"></div>
                <span class="event-details">${String(booking.start.getHours()).padStart(2, '0')}:${String(booking.start.getMinutes()).padStart(2, '0')} &#183; ${booking.reason}</span>
            </div>`;
        }
    }
}

/**
 * Fills in the date calendar view with the appropriate data
 * @param {Date} date
 */
async function generateDayCalendar(date) {
    // Set date text
    const dateEl = document.getElementById("current-timespan");
    dateEl.innerHTML = `${months[date.getMonth()]} ${date.getDate()}${generateOrdinalPostfix(date.getDate())}, ${date.getFullYear()}`;

    // Set header text
    const headerEl = document.getElementById("day-header-date");
    headerEl.innerHTML = `${months[date.getMonth()]} ${date.getDate()}${generateOrdinalPostfix(date.getDate())}, ${date.getFullYear()}`;

    // Get day start and end
    const dayStart = new Date(currentDate.getTime());
    const dayEnd = new Date(currentDate.getTime());
    dayStart.setHours(0, 0, 0, 0);
    dayEnd.setHours(23, 59, 59, 999);

    const bookings = await fetchBookings(dayStart, dayEnd);
    const foundBookings = bookings !== undefined;

    const dayViewEl = document.getElementById("calendar-day-view");
    dayViewEl.innerHTML = `<h1 id="day-header" class="pb-2">Events on <span id="day-header-date">${months[currentDate.getMonth()]} ${currentDate.getDate()}${generateOrdinalPostfix(currentDate.getDate())}, ${currentDate.getFullYear()}</span></h1>`

    if (foundBookings) {
        for (const booking of bookings) {
            const eventElText = `<div class="day-event-container" onclick='showBookingModal(event, ${JSON.stringify(booking)})'>
                    <div class="day-event-accent">&nbsp;</div>
                    <div class="day-event-info-container">
                        <h2 class="day-event-info">${booking.reason}</h2>
                        <span>${String(booking.start.getHours()).padStart(2, '0')}:${String(booking.start.getMinutes()).padStart(2, '0')}-${String(booking.end.getHours()).padStart(2, '0')}:${String(booking.end.getMinutes()).padStart(2, '0')}</span>
                    </div>
                </div>
                `
            dayViewEl.innerHTML += eventElText;
        }
    }
}

/**
 * Generates the ordinal postfix of a number (i.e. 1*st*, 2*nd*, 3*rd*, 4*th*, etc.)
 * @param {number} number The ordinal number
 * @returns {string} The corresponding ordinal postfix
 */
function generateOrdinalPostfix(number) {
    return number % 10 === 1 && number % 100 !== 11 ? "st" : number % 10 === 2 && number % 100 !== 12 ? "nd" : number % 10 === 3 && number % 100 !== 13 ? "rd" : "th"
}

async function deleteEventFromModal(bookingId, modalId) {
    // Delete from database
    const result = await fetch(`http://localhost:21923/calendar/bookings/${bookingId}`, {
        method: "delete"
    })

    console.log(JSON.stringify(result.ok))

    // Regenerate view
    view === "m" ? await generateMonthCalendar(currentDate) : await generateDayCalendar(currentDate);

    // Close modal
    closeModal(modalId);
}

function calendarBack() {
    if (view === "m") {
        // noinspection JSIgnoredPromiseFromCall
        generateMonthCalendar(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))
    } else {
        // noinspection JSIgnoredPromiseFromCall
        generateDayCalendar(new Date(currentDate.setDate(currentDate.getDate() - 1)))
    }
}

function calendarForward() {
    if (view === "m") {
        // noinspection JSIgnoredPromiseFromCall
        generateMonthCalendar(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))
    } else {
        // noinspection JSIgnoredPromiseFromCall
        generateDayCalendar(new Date(currentDate.setDate(currentDate.getDate() + 1)))
    }
}

async function changeToMonth() {
    if (view === "m") return;
    view = "m";
    document.getElementById("calendar-day-btn").style.backgroundColor = "";
    document.getElementById("calendar-day-btn").style.color = "#FFFFFF";
    document.getElementById("calendar-month-btn").style.backgroundColor = "#FFFFFF";
    document.getElementById("calendar-month-btn").style.color = "";
    await generateMonthCalendar(currentDate);
    document.getElementById("calendar-day-view").style.display = "none";
    document.getElementById("calendar-month-view").style.display = "";
}

async function changeToDay() {
    if (view === "d") return;
    view = "d";
    document.getElementById("calendar-day-btn").style.backgroundColor = "#FFFFFF";
    document.getElementById("calendar-day-btn").style.color = "";
    document.getElementById("calendar-month-btn").style.backgroundColor = "";
    document.getElementById("calendar-month-btn").style.color = "#FFFFFF";
    await generateDayCalendar(currentDate);
    document.getElementById("calendar-month-view").style.display = "none";
    document.getElementById("calendar-day-view").style.display = "";
}

async function selectDay(date, monthAdjust) {
    currentDate.setDate(date);
    currentDate.setMonth(currentDate.getMonth() + monthAdjust);
    await changeToDay();
    document.getElementById("calendar-month-view").style.display = "none";
    document.getElementById("calendar-day-view").style.display = "";
}

// Initialize the calendar on first launch
document.addEventListener("DOMContentLoaded", async () => {
    currentDate = new Date(Date.now());
    await changeToMonth();
})