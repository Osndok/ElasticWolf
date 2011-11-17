var ec2ui_KeypairTreeView = {
    COLNAMES : ['keypair.name','keypair.fingerprint'],
    model: "keypairs",

    viewDetails : function(event) {
        var keypair = this.getSelected();
        if (keypair == null) return;
        window.openDialog("chrome://ec2ui/content/dialog_keypair_details.xul", null, "chrome,centerscreen,modal,resizable", keypair);
    },


    createKeypair : function () {
        var name = prompt("Please provide a new keypair name");
        if (name == null) return;
        name = name.trim();
        var me = this;
        var wrap = function(name, key) {
            // Save key in the file
            var file = ec2ui_prefs.getPrivateKeyFile(name)
            var fp = FileIO.open(file)
            FileIO.write(fp, key + "\n\n", "");
            me.refresh();
            me.selectByName(name);
        }
        ec2ui_session.controller.createKeypair(name, wrap);
    },

    importKeypair : function () {
        var name = prompt("Please provide a new keypair name");
        if (name == null) return;
        name = name.trim();
        var me = this;
        var wrap = function(name) {
            me.refresh();
            me.selectByName(name);
        }
        // Create new private key file using openssl and return key value
        var file = ec2ui_session.promptForFile("Select the public key file to upload:")
        if (file) {
            var body = readPublicKey(file)
            ec2ui_session.controller.importKeypair(name, body, wrap);
        }
    },

    createCertAndKeypair: function () {
        var name = prompt("Please provide a new keypair name");
        if (name == null) return;
        name = name.trim();
        var me = this;
        var wrap = function(name) {
            me.refresh()
        }
        var wrap2 = function(id) {
            // Import new public key as new keypair
            var body = readPublicKey(ec2ui_prefs.getPublicKeyFile(name));
            ec2ui_session.controller.importKeypair(name, body, wrap);
        }
        ec2ui_session.showBusyCursor(true);

        // Create new certificate file using openssl and return cert value
        var body = ec2ui_session.generateCertificate(name);
        if (body) {
            ec2ui_session.controller.UploadSigningCertificate(body, wrap2);
        } else {
            alert("Could not create certificate");
            return;
        }
    },

    deleteSelected  : function () {
        var keypair = this.getSelected();
        if (keypair == null) return;
        if (!confirm("Delete key pair "+keypair.name+"?")) return;
        var me = this;
        var wrap = function() {
            me.refresh();
        }
        ec2ui_session.controller.deleteKeypair(keypair.name, wrap);
    }
};

ec2ui_KeypairTreeView.__proto__ = TreeView;
ec2ui_KeypairTreeView.register();
