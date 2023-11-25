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

module.exports = { addFriend }
