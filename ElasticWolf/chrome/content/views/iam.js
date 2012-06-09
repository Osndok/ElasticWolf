var ew_UsersTreeView = {
    model: "users",

    selectionChanged: function()
    {
        var me = this;
        var item = this.getSelected();
        if (!item) return;
        if (!item.groups) {
            ew_session.controller.listGroupsForUser(item.name, function(list) { me.invalidate() })
        }
        if (!item.policies) {
            ew_session.controller.listUserPolicies(item.name, function(list) { me.invalidate() })
        }
    },

    addUser: function()
    {
        var me = this;
        var name = prompt("User name");
        if (name) {
            ew_session.controller.createUser(name, "/", function() { me.refresh() })
        }
    },

    deleteUser: function()
    {
        var me = this;
        var item = this.getSelected();
        if (!item) return;
        if (!confirm("Delete user?")) return;
        ew_session.controller.deleteUser(item.name, function() { me.refresh() });
    },

    setPassword: function(update)
    {
        var me = this;
        var item = this.getSelected();
        if (!item) return;
        var pw = promptForPassword("Password", "Enter password for " + item.name);
        if (!pw) return;
        if (update) {
            ew_session.controller.updateLoginProfile(item.name, pw, function() { me.refresh() })
        } else {
            ew_session.controller.createLoginProfile(item.name, pw, function() { me.refresh() })
        }
    },

    changePassword: function()
    {
        var me = this;
        var item = this.getSelected();
        if (!item) return;
        var oldpw = promptForPassword("Old Password", "Enter current password");
        if (!oldpw) return;
        var newpw = promptForPassword("New Password", "Enter new password");
        if (!newpw) return;
        ew_session.controller.changePassword(oldpw, newpw, function() { me.refresh() })
    },

    renameUser: function()
    {
        var me = this;
        var item = this.getSelected();
        if (!item) return;
        var newname = promptForPassword("Rename User", "Enter new name");
        var newpath = promptForPassword("Rename User", "Enter new path");
        if (!newname && !newpath) return;
        ew_session.controller.updateUser(item.name, newname, newpath, function() { me.refresh() })
    },

    deletePassword: function()
    {
        var me = this;
        var item = this.getSelected();
        if (!item) return;
        if (!confirm("Delete password for user " + item.name + "?")) return;
        ew_session.controller.deleteLoginProfile(item.name, function() { me.refresh() });
    },

    addGroup: function()
    {
        var item = this.getSelected();
        if (!item) return;
        var list = ew_model.getGroups();
        var idx = ew_session.promptList("Group", "Select group to add this user to", list, ["name"]);
        if (idx < 0) return;
        var me = this;
        ew_session.controller.addUserToGroup(item.name, list[idx].name, function() { me.refresh() });
    },
};

ew_UsersTreeView.__proto__ = TreeView;
ew_UsersTreeView.register();

var ew_GroupsTreeView = {
    model: ["groups","users"],

    selectionChanged: function()
    {
        var me = this;
        var item = this.getSelected();
        if (!item) return;

        if (item.users) {
            ew_GroupUsersTreeView.display(item.users);
        } else {
            ew_session.controller.getGroup(item.name, function(list) { ew_GroupUsersTreeView.display(list); });
        }
        if (!item.policies) {
            ew_session.controller.listGroupPolicies(item.name, function(list) { me.invalidate() })
        }
    },

    addUser: function()
    {
        var item = this.getSelected();
        if (!item) return;
        var users = ew_model.getUsers();
        var idx = ew_session.promptList("User name", "Select user to add to current group?", users, ["name"]);
        if (idx < 0) return;
        var me = this;
        ew_session.controller.addUserToGroup(users[idx].name, item.name, function() { me.refresh() });
    },

    deleteUser: function()
    {
        var item = this.getSelected();
        if (!item) return;
        var user = ew_GroupUsersTreeView.getSelected()
        if (!user) return;
        if (!confirm("Remove user " + user.name + " from group " + item.name + "?")) return;
        var me = this;
        ew_session.controller.removeUserFromGroup(user.name, item.name, function() { me.refresh() });
    },

    addGroup: function()
    {
        var me = this;
        var name = prompt("Group name");
        if (name) {
            ew_session.controller.createGroup(name, "/", function() { me.refresh() })
        }
    },

    deleteGroup: function()
    {
        var me = this;
        var item = this.getSelected();
        if (!item) return;
        if (!confirm("Delete group?")) return;
        ew_session.controller.deleteGroup(item.name, function() { me.refresh() });
    },

    renameGroup: function()
    {
        var me = this;
        var item = this.getSelected();
        if (!item) return;
        var newname = promptForPassword("Rename Group", "Enter new name");
        var newpath = promptForPassword("Rename Group", "Enter new path");
        if (!newname && !newpath) return;
        ew_session.controller.updateGroup(item.name, newname, newpath, function() { me.refresh() })
    },
};

ew_GroupsTreeView.__proto__ = TreeView;
ew_GroupsTreeView.register();

var ew_GroupUsersTreeView = {
};
ew_GroupUsersTreeView.__proto__ = TreeView;

var ew_KeypairTreeView = {
    model: "keypairs",

    runShell: function() {
        var keypair = this.getSelected();
        ew_session.launchShell(keypair ? keypair.name: null);
    },

    createKeypair : function () {
        if (ew_session.isGovCloud()) {
            alert("This function is disabled in GovCloud mode")
            return
        }
        var name = prompt("Please provide a new keypair name");
        if (name == null) return;
        name = name.trim();
        var me = this;
        var wrap = function(name, key) {
            // Save key in the file
            var file = ew_prefs.getPrivateKeyFile(name)
            var fp = FileIO.open(file)
            FileIO.write(fp, key + "\n\n", "");
            me.refresh();
            me.select({name: name});
        }
        ew_session.controller.createKeypair(name, wrap);
    },

    importKeypair : function () {
        var name = prompt("Please provide a new keypair name");
        if (name == null) return;
        name = name.trim();
        var me = this;
        var wrap = function(name) {
            me.refresh();
            me.select({name: name});
        }
        // Create new private key file using openssl and return key value
        var file = ew_session.promptForFile("Select the public key file to upload:")
        if (file) {
            var body = readPublicKey(file)
            if (body == '') {
                return alert('Unable to read public key file ' + file);
            }
            ew_session.controller.importKeypair(name, body, wrap);
        }
    },

    createCertAndKeypair: function () {
        var name = prompt("Please provide a new keypair name");
        if (name == null) return;
        name = name.trim();
        var me = this;

        var file = ew_session.promptForDir("Choose where to store keys and certificate or Cancel to use " + ew_prefs.getKeyHome(), true)
        if (file) {
            ew_prefs.setKeyHome(file);
        }


        // Create new certificate file using openssl and return cert value
        var body = ew_session.generateCertificate(name);
        if (!body) {
            return alert("Could not create certificate and key pair files");
        }

        // Delay to avoid "not valid yet" error due to clock drift
        setTimeout(function() { ew_session.controller.uploadSigningCertificate(body, function() {ew_CertTreeView.refresh();}); }, 30000);

        // Import new public key as new keypair
        var file = ew_prefs.getPublicKeyFile(name);
        var pubkey = readPublicKey(file);
        if (pubkey == '') {
            return alert('Unable to read public key file ' + file);
        }
        ew_session.controller.importKeypair(name, pubkey, function() {me.refresh();});
    },

    deleteSelected  : function () {
        var keypair = this.getSelected();
        if (keypair == null) return;
        if (!confirm("Delete key pair "+keypair.name+"?")) return;
        var me = this;
        ew_session.controller.deleteKeypair(keypair.name, function() {me.refresh();});
    }
};

ew_KeypairTreeView.__proto__ = TreeView;
ew_KeypairTreeView.register();

var ew_AccessKeyTreeView = {
    model: ["accesskeys","users"],

    createAccessKey : function () {
        var me = this;
        var wrap = function(user, key, secret) {
            ew_session.savePassword('AccessKey:' + key, secret);
            me.refresh()
        }
        var user = null;
        var users = ew_model.getUsers();
        if (users) {
            var idx = ew_session.promptList("User name", "Select user which needs access key?", users, ["name"]);
            if (idx < 0) return;
            user = users[idx].name;
        }
        ew_session.controller.createAccessKey(user, wrap);
    },

    getAccessKeySecret : function(key) {
        var secret = ew_session.getPassword('AccessKey:' + key)
        if (secret == "" && key == ew_session.accessCode) {
            secret = ew_session.secretKey
        }
        return secret
    },

    deleteSelected  : function () {
        var key = this.getSelected();
        if (key == null) return;
        if (key.current) {
            alert("You cannot delete current access key")
            return;
        }
        if (!ew_session.promptYesNo("Confirm", "Delete access key "+key.id+"?")) return;

        var me = this;
        var wrap = function() {
            ew_session.deletePassword('AccessKey:' + key.id)
            me.refresh();
        }
        ew_session.controller.deleteAccessKey(key.name, wrap);
    },

    exportSelected  : function () {
        var key = this.getSelected();
        if (key == null) return;
        key.secret = this.getAccessKeySecret(key.id)
        if (key.secret == "") {
            alert("No secret key available for this access key")
            return
        }
        var path = ew_session.promptForFile("Choose file where to export this access key", true)
        if (path) {
            FileIO.write(FileIO.open(path), "AWSAccessKeyId=" + key.id + "\nAWSSecretKey=" + key.secret + "\n")
        }
    },

    switchCredentials  : function () {
        var key = this.getSelected();
        if (key == null) return;
        key.secret = this.getAccessKeySecret(key.AccessKeyId)
        if (key.secret == "") {
            alert("Access key " + key.name + " does not have secret code available, cannot use this key");
            return;
        }

        if (!ew_session.promptYesNo("Confirm", "Use access key "+key.id+" for authentication for user " + key.useName + "?, current access key/secret will be discarded.")) return;
        ew_session.setCredentials(key.name, key.secret);
        ew_session.updateCredentials(ew_session.getActiveCredentials(), key.id, key.secret);
        this.refresh();
    }
};
ew_AccessKeyTreeView.__proto__ = TreeView;
ew_AccessKeyTreeView.register();

var ew_CertTreeView = {
    model: 'certs',

    createCert : function () {
        var me = this;
        var body = ew_session.generateCertificate();
        if (body) {
            ew_session.controller.uploadSigningCertificate(body, function() { me.refresh(); });
        } else {
            alert("Could not generate new X509 certificate")
        }
    },

    uploadCert : function () {
        var me = this;
        var file = ew_session.promptForFile("Select the certificate file to upload:")
        if (file) {
            var body = FileIO.toString(file);
            ew_session.controller.uploadSigningCertificate(body, function() { me.refresh(); });
        }
    },

    deleteSelected  : function () {
        var item = this.getSelected();
        if (item == null) return;
        if (!confirm("Delete certificate "+item.id+"?")) return;

        var me = this;
        ew_session.controller.deleteSigningCertificate(item.id, function() { me.refresh(); });
    },
};
ew_CertTreeView.__proto__ = TreeView;
ew_CertTreeView.register();
