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
            gameRooms: GameRooms.find({}, {
                sort: {
                    passwordProtected: 1,
                    createdAt: -1
                }
            })
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

Router.onStop(function() {
    Meteor.call('removeJoinAuth');
}, {only: 'gameRoomPage'});