var ec2ui_SnapshotTreeView = {
    COLNAMES: ['snap.id', 'snap.volumeId', 'snap.status', 'snap.startTime',
              'snap.progress', 'snap.volumeSize', 'snap.description', 'snap.amiId', 'snap.amiName', 'snap.owner', 'snap.ownerAlias', 'snap.tag'],
    imageIdRegex : new RegExp("^snap-"),

    getSearchText : function() {
        return document.getElementById('ec2ui.snapshots.search').value;
    },

    refresh : function() {
        ec2ui_session.showBusyCursor(true);
        ec2ui_session.controller.describeSnapshots();
        ec2ui_session.showBusyCursor(false);
    },

    invalidate : function() {
        var target = ec2ui_SnapshotTreeView;
        target.filterAndDisplaySnapshots();
    },

    filterAndDisplaySnapshots : function() {
        var type = document.getElementById("ec2ui_SnapshotTreeView.snapshot.type").value;
        if (type == "my_snapshots") {
            var groups = ec2ui_model.getSecurityGroups();

            if (groups) {
                var group = groups[0];
                var currentUser = ec2ui_session.lookupAccountId(group.ownerId);
            }
        }

        var snapshots = (ec2ui_model.snapshots || []);
        var filterAMI = document.getElementById("ec2ui.snapshots.noami").checked;

        if (filterAMI) {
          var newSnapshots = [];

          for (var i = 0; i < snapshots.length; i++) {
            var snap = snapshots[i];

            if (!(snap.amiId || '').trim()) {
              newSnapshots.push(snap);
            }
          }

          snapshots = newSnapshots;
        }

        snapshots = this.filterImages(snapshots, currentUser);

        this.displayImages(snapshots);
    },

    snapshotTypeChanged : function() {
        document.getElementById("ec2ui.snapshots.search").value = "";
        this.filterAndDisplaySnapshots();
    },

    searchChanged : function(event) {
        document.getElementById("ec2ui_SnapshotTreeView.snapshot.type").selectedIndex = 1;
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
        this.searchTimer = setTimeout(this.invalidate, 500);
    },

    register : function() {
        if (!this.registered) {
            this.registered = true;
            ec2ui_model.registerInterest(this, 'snapshots');
        }
    },

    viewDetails : function(event) {
        var image = this.getSelectedImage();
        if (image == null) return;
        window.openDialog("chrome://ec2ui/content/dialog_snapshot_details.xul", null, "chrome,centerscreen,modal,resizable", image);
    },

    selectionChanged : function(event) {
        var me = this;
        var image = this.getSelectedImage();
        if (image == null) return;

        function wrap(id, acls) {
            var list = me.getPermissionsList();
            var count = list.getRowCount();
            for ( var i = count - 1; i >= 0; i--) {
                list.removeItemAt(i);
            }

            for (var i in acls) {
                list.appendItem(acls[i], acls[i]);
            }
            image.acls = acls;
        }

        if (image.acls) {
            wrap(image.id, image.acls);
        } else {
            ec2ui_session.controller.describeSnapshotAttribute(image.id, wrap);
        }
    },

    getPermissionsList : function()
    {
        return document.getElementById("ec2ui.snapshot.permissions.list");
    },

    getSelectedPermission : function()
    {
        var item = this.getPermissionsList().getSelectedItem(0);
        if (item == null) return null;
        return item.value;
    },

    addPublicPermission: function()
    {
        var me = this;
        var image = this.getSelectedImage();
        if (image == null) return;
        image.acls = null;
        ec2ui_session.controller.modifySnapshotAttribute(image.id, [ [ "Group", "all" ]], null, function() { me.refresh(true); });
    },

    addPermission: function()
    {
        var me = this;
        var image = this.getSelectedImage();
        if (image == null) return;
        var user = prompt("Please provide an EC2 user ID");
        if (user == null) return;
        image.acls = null;
        ec2ui_session.controller.modifySnapshotAttribute(image.id, [ [ "UserId", user ]], null, function() { me.refresh(true); });
    },

    deletePermission: function()
    {
        var me = this;
        var image = this.getSelectedImage();
        if (image == null) return;
        var perm = this.getSelectedPermission();
        if (!perm) return
        if (!confirm("Remove permissions " + perm + " from " + image.id + "?")) return;
        image.acls = null;
        ec2ui_session.controller.modifySnapshotAttribute(image.id, null, [ [ perm[0], perm[1] ]], function() { me.refresh(true); });
    },

    deleteSnapshot : function () {
        var image = this.getSelectedImage();
        if (image == null) return;
        var label = image.name ? (image.name + '@' + image.id) : image.id;
        if (!confirm("Delete snapshot " + label + "?"))  return;
        ec2ui_session.controller.deleteSnapshot(image.id);
    },

    createVolume : function () {
        var image = this.getSelectedImage();
        if (image == null) return;
        ec2ui_VolumeTreeView.createVolume(image);
    },

    displayImages : function (imageList) {
        BaseImagesView.displayImages.call(this, imageList);

        if (ec2ui_prefs.isRefreshOnChangeEnabled()) {
            // Determine if there are any pending operations
            if (this.pendingUpdates()) {
                this.startRefreshTimer("ec2ui_SnapshotTreeView", ec2ui_SnapshotTreeView.refresh);
            } else {
                this.stopRefreshTimer("ec2ui_SnapshotTreeView");
            }
        } else {
            this.stopRefreshTimer("ec2ui_SnapshotTreeView");
        }
    },

    pendingUpdates : function() {
        // Walk the list of snapshots to see whether there is a volume
        // whose state needs to be refreshed
        var snaps = ec2ui_session.model.snapshots;
        var fPending = false;

        if (snaps == null) {
            return fPending;
        }

        for (var i in snaps) {
            if (snaps[i].status == "completed") {
                continue;
            }
            fPending = true;
            break;
        }

        return fPending;
    },

    showRegisterImageFromSnapshotDialog : function() {
        var retVal = {ok:null,amiName:null,amiDescription:null};
        var image = this.getSelectedImage();
        if (image == null) return;

        window.openDialog("chrome://ec2ui/content/dialog_register_image_from_snapshot.xul", null, "chrome,centerscreen,modal,resizable", image.id, ec2ui_session, retVal);
        if (retVal.ok) {
            var wrap = function(id) {
                alert("A new AMI is registered.\n\nThe AMI ID is: "+id);
            }
            ec2ui_session.controller.registerImageFromSnapshot(image.id, retVal.amiName, retVal.amiDescription, retVal.architecture, retVal.kernelId, retVal.ramdiskId, retVal.deviceName, retVal.deleteOnTermination, wrap);
        }
    },
};

// poor-man's inheritance
ec2ui_SnapshotTreeView.__proto__ = BaseImagesView;

ec2ui_SnapshotTreeView.register();
