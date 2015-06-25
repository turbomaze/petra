Router.configure({
    layoutTemplate: 'layout',
    loadingTemplate: 'loading',
    notFoundTemplate: 'notFound'
});

Router.route('/', {
    name: 'home',
    template: 'gameRoomsList',
    waitOn: function() {
        return [Meteor.subscribe('gameRooms')]
    },
    data: function() {
        return {
            gameRooms: GameRooms.find()
        };
    }
});

Router.route('/room/:_id/auth', {
    name: 'gameRoomAuthPage',
    template: 'gamePassword',
    waitOn: function() {
        return [Meteor.subscribe('singleGameRoom', this.params._id)];
    },
    data: function() {
        return GameRooms.findOne(this.params._id);
    }
});

Router.route('/room/:_id', {
    name: 'gameRoomPage',
    template: 'gameRoomPage',
    waitOn: function() {
        return [Meteor.subscribe('singleGameRoom', this.params._id)];
    },
    data: function() {
        return GameRooms.findOne(this.params._id);
    },
    onBeforeAction: function() {
        if (isInGameRoom(this.params._id)) {
            this.next();
        } else {
            Router.go('gameRoomAuthPage', {
                _id: this.params._id
            });
        }
    }
});

var removeJoinAuth = function() {
    if (!!Meteor.userId()) {
        //logged in
        var user = Meteor.user();
        var currRoom = !!user.profile ? user.profile.currentGameRoom : false;

        //if they're in a room already
        if (!!currRoom) {
            //remove them from the room's player list
            GameRooms.update({_id: currRoom}, {
                $pullAll: {
                    players: [Meteor.userId()]
                }
            });

            //get rid of their currentGameRoom property
            Meteor.users.update({_id: Meteor.userId()}, {
                $set: {'profile.currentGameRoom': false}
            });

            return true;
        } else {
            //they're not in a game room; success
            return true;
        }
    } else {
        //they're logged out so no removal is needed; success
        return true;
    }
};

Router.onStop(function() {
    removeJoinAuth();
}, {only: 'gameRoomPage'});