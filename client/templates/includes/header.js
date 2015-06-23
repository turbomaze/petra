Template.header.events({
    'click .logout': function() {
        Meteor.logout();
    }
});