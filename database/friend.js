const mySqlDatabase = include('databaseConnectionSQL');

async function addFriend(data) {
  let firstSQL = `
    INSERT INTO friendList (user_id, friend_id, friend_status)
    value (:user_id, :friend_id, :status)
`;
  //   let secondSQL = `
  //     INSERT INTO friendList (user_id, friend_id, friend_status)
  //     value (:user_id, :friend_id, :false)
  // `;


  let params1 = {
    user_id: data.user_id,
    friend_id: data.friend_id,
    status: data.status,
  };


  // let params2 = {
  //   user_id: data.friend_id,
  //   friend_id: data.user_id,
  //   false: false,
  // };
  try {
    const result1 = await mySqlDatabase.query(firstSQL, params1);
    const result2 = await mySqlDatabase.query(secondSQL, params2);
    console.log(result1)
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
async function retrieveSentRequest(data) {
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


async function acceptFriendRequest(data) {
  let preSQLStatement = `
    update friendList 
    set friend_status = 1
    where friendList.user_id = :friend_id and friendList.friend_id = :user_id;
`
  let params = {
    user_id: data.user_id,
    friend_id: data.friend_id,
  }
  try {
    const result = await mySqlDatabase.query(preSQLStatement, params)
    console.log("result of test" + JSON.stringify(result))
    return true;
  } catch (err) {
    console.log("failed to accept friend :" + err)
    return false
  }

}

module.exports = { addFriend, retrieveFriend, retrieveSentRequest, acceptFriendRequest }
