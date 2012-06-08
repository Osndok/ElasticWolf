var ew_UsersTreeView = {
    COLNAMES : ['users.name','users.path', 'users.arn'],
    model: "users",

};

ew_UsersTreeView.__proto__ = TreeView;
ew_UsersTreeView.register();

var ew_GroupsTreeView = {
    COLNAMES : ['groups.name',"groups.path", "groups.arn"],
    model: "groups",
};
ew_GroupsTreeView.__proto__ = TreeView;
ew_GroupsTreeView.register();
