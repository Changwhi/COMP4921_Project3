const mySqlDatabase = include('databaseConnectionSQL');

async function getFriendEvents(postData) {
    let getFriendEventSQL = `
        select activeUserEvent.color, activeUserEvent.start, activeUserEvent.end, activeUserEvent.user_id, loggedInUser.email, loggedInUser.name as title 
        from event as activeUserEvent
        JOIN user as loggedInUser
        ON activeUserEvent.user_id = loggedInUser.user_id
        where loggedInUser.user_id = :user_id
        union
        select activeFriend.color, activeFriend.start, activeFriend.end, activeFriend.user_id, friendsOfUser.email, friendsOfUser.name as title
        from event activeFriend
        join user as friendsOfUser
        on activeFriend.user_id = friendsOfUser.user_id
        where friendsOfUser.user_id in (
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