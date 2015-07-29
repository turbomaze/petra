Template.header.events({
    'click .logout': function() {
        Meteor.users.update({_id: Meteor.userId()}, {
            $set: {
                'profile.currentGameRoom': false,
                'profile.leftAt': false
            }
        });
        Meteor.logout();
    }
});