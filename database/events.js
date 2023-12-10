const mySqlDatabase = include('databaseConnectionSQL');

async function createEvent(postData) {
  let createEventSQL = `
    INSERT INTO event (title, start, end, user_id, color, backgroundColor)
    VALUES (:event_name, :event_start, :event_end,
        (SELECT user_id
         FROM user
         WHERE user_id = :user_id), :event_color, :backgroundColor );
	`;

  let params = {
    event_name: postData.event_name,
    event_start: postData.event_start_date,
    event_end: postData.event_end_date,
    user_id: postData.user_id,
    event_color: postData.event_color,
    backgroundColor: postData.backgroundColor
  }

  try {
    const result = await mySqlDatabase.query(createEventSQL, params);
    console.log("Successfully created event");
    return result;
  }
  catch (err) {
    console.log("Error inserting event");
    console.log(err);
    return false;
  }
}

async function addFriendsToEvent(postData) {
  let createEventSQL = `
    INSERT INTO user_event (user_id, event_id, owner_id)
    VALUES (:user_id, :event_id, :owner_id)
`;
  let params = {
    user_id: postData.user_id,
    event_id: postData.event_id,
    owner_id: postData.owner_id,
  }

  try {
    await mySqlDatabase.query(createEventSQL, params)
    return true;
  } catch (err) {
    console.log("Error in addFriendsToEvent");
    console.log(err);
    return false;

  }
}


async function getEvents(postData) {
  let getEventSQL = `
    select ue.owner_id, e.title, e.start, e.end, e.user_id, e.color, e.isRemoved, e.backgroundColor
from user_event as ue
join event as e
on e.event_id = ue.event_id
where ue.user_id = :user_id

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


module.exports = { createEvent, getEvents, addFriendsToEvent };
