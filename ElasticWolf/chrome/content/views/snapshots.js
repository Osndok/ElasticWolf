var ew_SnapshotTreeView = {
    COLNAMES: ['snap.id', 'snap.volumeId', 'snap.status', 'snap.startTime', 'snap.progress', 'snap.volumeSize', 'snap.description', 'snap.amiId', 'snap.amiName', 'snap.owner', 'snap.ownerAlias', 'snap.tags'],
    model: ['snapshots', 'securityGroups'],
    searchElement: 'ew.snapshots.search',

    filter: function(list) {
        if (!list) return list;
        if ($("ew_SnapshotTreeView.snapshot.type").value == "my_snapshots") {
            var groups = ew_model.getSecurityGroups();
            if (groups) {
                owner = groups[0].ownerId;
                var nlist = [];
                for (var i = 0; i < list.length; i++) {
                    if (list[i].owner == owner) {
                        nlist.push(list[i]);
                    }
                }
                list = nlist;
            }
        }

        if ($("ew.snapshots.noami").checked) {
            var nlist = [];
            for (var i = 0; i < list.length; i++) {
                if (!(list[i].amiId || '').trim()) {
                    nlist.push(list[i]);
                }
            }
            list = nlist;
        }
        return TreeView.filter.call(this, list);
    },

    snapshotTypeChanged : function() {
        $(this.searchElement).value = "";
        this.invalidate();
    },

    selectionChanged : function(event) {
        var me = this;
        var image = this.getSelected();
        if (image == null) return;

        function wrap(id, acls) {
            var list = me.getPermissionsList();
            var count = list.getRowCount();
            for ( var i = count - 1; i >= 0; i--) {
                list.removeItemAt(i);
            }
            for (var i in acls) {
                list.appendItem(acls[i].label, acls[i].id);
            }
            image.acls = acls;
        }

        if (image.acls) {
            wrap(image.id, image.acls);
        } else {
            ew_session.controller.describeSnapshotAttribute(image.id, wrap);
        }
    },

    getPermissionsList : function()
    {
        return document.getElementById("ew.snapshot.permissions.list");
    },

    getSelectedPermission : function()
    {
        var item = this.getPermissionsList().getSelectedItem(0);
        if (item == null) return null;
        return item;
    },

    addPublicPermission: function()
    {
        var me = this;
        var image = this.getSelected();
        if (image == null) return;
        image.acls = null;
        ew_session.controller.modifySnapshotAttribute(image.id, [ [ "Group", "all" ]], null, function() { me.refresh(true); });
    },

    addPermission: function()
    {
        var me = this;
        var image = this.getSelected();
        if (image == null) return;
        var user = prompt("Please provide an EC2 user ID");
        if (user == null) return;
        image.acls = null;
        ew_session.controller.modifySnapshotAttribute(image.id, [ [ "UserId", user ]], null, function() { me.refresh(true); });
    },

    deletePermission: function()
    {
        var me = this;
        var image = this.getSelected();
        if (image == null) return;
        var perm = this.getSelectedPermission();
        if (!perm) return
        if (!confirm("Remove permissions " + perm.label + " from " + image.id + "?")) return;
        image.acls = null;
        ew_session.controller.modifySnapshotAttribute(image.id, null, [ [ perm.label.split(":")[0], perm.value ]], function() { me.refresh(true); });
    },

    deleteSnapshot : function () {
        var image = this.getSelected();
        if (image == null) return;
        var label = image.name ? (image.name + '@' + image.id) : image.id;
        if (!confirm("Delete snapshot " + label + "?"))  return;
        ew_session.controller.deleteSnapshot(image.id);
    },

    createVolume : function () {
        var image = this.getSelected();
        if (image == null) return;
        ew_VolumeTreeView.createVolume(image);
    },

    isRefreshable: function() {
        for (var i in this.treeList) {
            if (this.treeList[i].status != "completed") return true;
        }
        return false;
    },

    showRegisterImageFromSnapshotDialog : function() {
        var image = this.getSelected();
        if (image == null) return;
        var retVal = {ok:null,amiName:null,amiDescription:null};
        window.openDialog("chrome://ew/content/dialogs/create_snapshot_ami.xul", null, "chrome,centerscreen,modal,resizable", image.id, ew_session, retVal);
        if (retVal.ok) {
            var wrap = function(id) {
                alert("A new AMI is registered.\n\nThe AMI ID is: "+id);
            }
            ew_session.controller.registerImageFromSnapshot(image.id, retVal.amiName, retVal.amiDescription, retVal.architecture, retVal.kernelId, retVal.ramdiskId, retVal.deviceName, retVal.deleteOnTermination, wrap);
        }
    },
};

ew_SnapshotTreeView.__proto__ = TreeView;
ew_SnapshotTreeView.register();
