Router.configure({
    layoutTemplate: 'layout',
    loadingTemplate: 'loading',
    notFoundTemplate: 'notFound',
    trackPageView: true
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
            Meteor.users.update({_id: Meteor.userId()}, {
                $set: {
                    'profile.currentGameRoom': this.params._id,
                    'profile.leftAt': false
                }
            });
            this.next();
        } else {
            Router.go('gameRoomAuthPage', {
                _id: this.params._id
            });
        }
    }
});

Router.onBeforeAction('dataNotFound');

Router.onStop(function() {
    Meteor.call('leaveRoom');
    document.title = 'Petra'; //default title
}, {only: 'gameRoomPage'});
