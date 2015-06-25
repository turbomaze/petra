Template.header.events({
    'click .logout': function() {
        Meteor.call('removeJoinAuth');
        Meteor.logout();
    }
});