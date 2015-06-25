var isRoomOwner = function(gameRoom) {
    return Meteor.userId() && Meteor.userId() === gameRoom.userId;
};

Template.gameRoomPage.helpers({
    isRoomOwner: function() {
        return isRoomOwner(this);
    }
});

Template.gameRoomPage.events({
    'click .delete': function(e, tmpl) {
        e.preventDefault();

        if (isRoomOwner(this)) {
            GameRooms.remove(this._id);
            Router.go('home');
        }
    }
});