var TreeView = {
    treeBox: null,
    selection: null,
    users: new Array,
    getRowCount: function () {
        this.rowCount = this.users.length;
        return this.users.length;
    },
    setTree: function (tree) {
        this.treeBox = tree;
    },
    getCellText: function (idx, _47) {
        if (idx >= this.getRowCount()) {
            return "";
        }
        if (_47.id == "s3_allUsers_userName") {
            var _48 = this.users[idx].DisplayName;
            if (this.users[idx].Owner) {
                _48 += "(Owner)";
            }
            return _48;
        }
    },
    getCellValue: function (idx, _4a) {
        if (idx >= this.getRowCount()) {
            return "";
        }
        if (_4a.id == "s3_allUsers_permRead") {
            return this.users[idx].Permissions.Read;
        }
        if (_4a.id == "s3_allUsers_permWrite") {
            return this.users[idx].Permissions.Write;
        }
        if (_4a.id == "s3_allUsers_permFull") {
            return this.users[idx].Permissions.Full;
        }
    },
    setCellValue: function (idx, _4c, _4d) {
        if (idx >= this.getRowCount()) {
            return "";
        }
        if (_4c.id == "s3_allUsers_permRead") {
            if (this.users[idx].Permissions.Full.toString() != "true") {
                this.users[idx].Permissions.Read = _4d;
            }
        }
        if (_4c.id == "s3_allUsers_permWrite") {
            if (this.users[idx].Permissions.Full.toString() != "true") {
                this.users[idx].Permissions.Write = _4d;
            }
        }
        if (_4c.id == "s3_allUsers_permFull") {
            this.users[idx].Permissions.Full = _4d;
            if (_4d.toString() == "true") {
                this.users[idx].Permissions.Read = _4d;
                this.users[idx].Permissions.Write = _4d;
            }
        }
    },
    isEditable: function (idx, _4f) { return true; },
    isContainer: function (idx) { return false; },
    isSeparator: function (idx) { return false; },
    isSorted: function () { return false; },
    getImageSrc: function (idx, _53) {},
    getProgressMode: function (idx, _55) {},
    cycleHeader: function (col) {},
    selectionChanged: function () {},
    cycleCell: function (idx, _58) {},
    performAction: function (_59) {},
    performActionOnCell: function (_5a, _5b, _5c) {},
    getRowProperties: function (idx, _5e, _5f) {},
    getCellProperties: function (idx, _61, _62) {},
    getColumnProperties: function (_63, _64, _65) {},
    getLevel: function (idx) { return 0; }
};

function apply() {
    this.retVal.user = document.getElementById("ec2ui.users").value;
    this.retVal.ok = false;
    return true;
}

function init() {
    this.session = window.arguments[0];
    this.retVal = window.arguments[1];
    this.tree = document.getElementById("ec2ui.tree")

    document.getElementById("ec2ui.path").value = (this.retVal.item.bucket || "") + "/" + this.retVal.item.name;

    var users = this.session.model.getUsers()
    var menu = document.getElementById("ec2ui.users");
    for (var i in users) {
        menu.appendItem(users[i].name, users[i].id);
    }
    menu.selectedIndex = 0

    this.tree.view = TreeView
    TreeView.users.push({ id: "http://acs.amazonaws.com/groups/global/AllUsers", name: "Everyone", type: "Group" } );
    TreeView.users.push({ id: "http://acs.amazonaws.com/groups/global/AuthenticatedUsers", name: "Authenticated Users", type: "Group" } );
}

function User(id, name, type) {
    this.id = id;
    this.name = name;
    this.type = _42;
    this.owner = false;
    this.permissions = { "Read": false, "Write": false, "Full": false };
}

function addUser(how) {
    var id = prompt("Please give the " + how + " for the user...");
    if (!id) return;
    switch (how) {
    case "email":
        this.tree.users.push(new User(id, id, "AmazonCustomerByEmail"));
        break;

    default:
        this.tree.users.push({ type: "CanonicalUser", id: id, name: id } );
    }
}

function removeUser() {
    var idx = TreeView.selection.currentIndex;
    if (idx < 0) return;
    this.users.splice(idx, 1);
    if (s3_AllUsersTreeView.treeBox) {
        s3_AllUsersTreeView.treeBox.rowCountChanged(idx, -1);
    }
}
