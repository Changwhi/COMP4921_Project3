const mySqlDatabase = include('databaseConnectionSQL');

async function getFriendEvents(postData) {
    let getFriendEventSQL = `
        select * 
        from event
        where user_id = :user_id
        union
        select *
        from event
        where user_id in (
        select f.user_id
        from friendList as f
        join user as u
        on u.user_id = f.friend_id
        where u.user_id = :user_id);
    `;

    let params = {
        user_id: postData.user_id
    }
    try {
        const result = await mySqlDatabase.query(getFriendEventSQL, params);
        return result[0];

    } catch (err) {
        console.log("Error in getting friend events")
        console.log(err);
        return false
    }
}

module.exports = {
    getFriendEvents
};