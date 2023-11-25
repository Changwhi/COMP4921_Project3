const mySqlDatabase = include('databaseConnectionSQL');

async function addFriend(data) {
  let createSQL = `
    INSERT INTO friendList (user_id, friend_id, friend_status)
    value (:user_id, :friend_id, :false)
`;

  let params = {
    user_id: data.user_id,
    friend_id: data.friend_id,
    false: false,
  };

  try {
    const result = await mySqlDatabase.query(createSQL, params);
    console.log(result)
    return true;
  } catch (err) {
    console.log("Error: addFriend - " + err)
    return false;
  }
}

async function retrieveFriend(data) {
  let preSQLStatement = `
      select * 
from friendList as f
join user as u
on u.user_id = f.friend_id
where f.user_id = ?
`
  let params = [data.user_id]
  console.log("UID" + params)
  try {
    const result = await mySqlDatabase.query(preSQLStatement, params)
    return result;
  } catch (err) {
    return err
  }

}
async function sentRequest(data) {
  let preSQLStatement = `
      select * 
from friendList as f
join user as u
on u.user_id = f.user_id
where f.friend_id = ? 
and f.friend_status = 0;
`
  let params = [data.user_id]
  console.log("UID" + params)
  try {
    const result = await mySqlDatabase.query(preSQLStatement, params)
    return result;
  } catch (err) {
    return err
  }

}



module.exports = { addFriend, retrieveFriend, sentRequest }
