const mySqlDatabase = include('databaseConnectionSQL');

async function createEvent(postData) {
  let createEventSQL = `
    INSERT INTO event (title, start, end, user_id, color)
    VALUES (:event_name, :event_start, :event_end,
        (SELECT user_id
         FROM user
         WHERE user_id = :user_id), :event_color);
	`;

  let params = {
    event_name: postData.event_name,
    event_start: postData.event_start_date,
    event_end: postData.event_end_date,
    user_id: postData.user_id,
    event_color: postData.event_color
  }

	try {
		await mySqlDatabase.query(createEventSQL, params);
        console.log("Successfully created event");
		return true;
	}
	catch(err) {
        console.log("Error inserting event");
        console.log(err);
		return false;
	}
}


async function getEvents(postData) {
    let getEventSQL = `
    SELECT title, start, end, color
    FROM event
    WHERE user_id = :user_id;
    `;

    let params = {
        user_id: postData.user_id
    }
    try {
        const result = await mySqlDatabase.query(getEventSQL, params);
        return result[0];

    } catch (err) {
        console.log("Error in getting event")
        console.log(err);
        return false
    }
}


module.exports = { createEvent, getEvents };
