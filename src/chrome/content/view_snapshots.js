var ew_SnapshotTreeView = {
    COLNAMES: ['snap.id', 'snap.volumeId', 'snap.status', 'snap.startTime',
              'snap.progress', 'snap.volumeSize', 'snap.description', 'snap.amiId', 'snap.amiName', 'snap.owner', 'snap.ownerAlias', 'snap.tag'],
    imageIdRegex : new RegExp("^snap-"),

    getSearchText : function() {
        return document.getElementById('ew.snapshots.search').value;
    },

    refresh : function() {
        ew_session.showBusyCursor(true);
        ew_session.controller.describeSnapshots();
        ew_session.showBusyCursor(false);
    },

    invalidate : function() {
        var target = ew_SnapshotTreeView;
        target.filterAndDisplaySnapshots();
    },

    filterAndDisplaySnapshots : function() {
        var type = document.getElementById("ew_SnapshotTreeView.snapshot.type").value;
        if (type == "my_snapshots") {
            var groups = ew_model.getSecurityGroups();

            if (groups) {
                var group = groups[0];
                var currentUser = ew_session.lookupAccountId(group.ownerId);
            }
        }

        var snapshots = (ew_model.snapshots || []);
        var filterAMI = document.getElementById("ew.snapshots.noami").checked;

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
        document.getElementById("ew.snapshots.search").value = "";
        this.filterAndDisplaySnapshots();
    },

    searchChanged : function(event) {
        document.getElementById("ew_SnapshotTreeView.snapshot.type").selectedIndex = 1;
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
        this.searchTimer = setTimeout(this.invalidate, 500);
    },

    register : function() {
        if (!this.registered) {
            this.registered = true;
            ew_model.registerInterest(this, 'snapshots');
        }
    },

    viewDetails : function(event) {
        var image = this.getSelectedImage();
        if (image == null) return;
        window.openDialog("chrome://ew/content/dialog_snapshot_details.xul", null, "chrome,centerscreen,modal,resizable", image);
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
        var image = this.getSelectedImage();
        if (image == null) return;
        image.acls = null;
        ew_session.controller.modifySnapshotAttribute(image.id, [ [ "Group", "all" ]], null, function() { me.refresh(true); });
    },

    addPermission: function()
    {
        var me = this;
        var image = this.getSelectedImage();
        if (image == null) return;
        var user = prompt("Please provide an EC2 user ID");
        if (user == null) return;
        image.acls = null;
        ew_session.controller.modifySnapshotAttribute(image.id, [ [ "UserId", user ]], null, function() { me.refresh(true); });
    },

    deletePermission: function()
    {
        var me = this;
        var image = this.getSelectedImage();
        if (image == null) return;
        var perm = this.getSelectedPermission();
        if (!perm) return
        if (!confirm("Remove permissions " + perm.label + " from " + image.id + "?")) return;
        image.acls = null;
        ew_session.controller.modifySnapshotAttribute(image.id, null, [ [ perm.label.split(":")[0], perm.value ]], function() { me.refresh(true); });
    },

    deleteSnapshot : function () {
        var image = this.getSelectedImage();
        if (image == null) return;
        var label = image.name ? (image.name + '@' + image.id) : image.id;
        if (!confirm("Delete snapshot " + label + "?"))  return;
        ew_session.controller.deleteSnapshot(image.id);
    },

    createVolume : function () {
        var image = this.getSelectedImage();
        if (image == null) return;
        ew_VolumeTreeView.createVolume(image);
    },

    displayImages : function (imageList) {
        BaseImagesView.displayImages.call(this, imageList);

        if (ew_prefs.isRefreshOnChangeEnabled()) {
            // Determine if there are any pending operations
            if (this.pendingUpdates()) {
                this.startRefreshTimer("ew_SnapshotTreeView", ew_SnapshotTreeView.refresh);
            } else {
                this.stopRefreshTimer("ew_SnapshotTreeView");
            }
        } else {
            this.stopRefreshTimer("ew_SnapshotTreeView");
        }
    },

    pendingUpdates : function() {
        // Walk the list of snapshots to see whether there is a volume
        // whose state needs to be refreshed
        var snaps = ew_session.model.snapshots;
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

        window.openDialog("chrome://ew/content/dialog_register_image_from_snapshot.xul", null, "chrome,centerscreen,modal,resizable", image.id, ew_session, retVal);
        if (retVal.ok) {
            var wrap = function(id) {
                alert("A new AMI is registered.\n\nThe AMI ID is: "+id);
            }
            ew_session.controller.registerImageFromSnapshot(image.id, retVal.amiName, retVal.amiDescription, retVal.architecture, retVal.kernelId, retVal.ramdiskId, retVal.deviceName, retVal.deleteOnTermination, wrap);
        }
    },
};

// poor-man's inheritance
ew_SnapshotTreeView.__proto__ = BaseImagesView;

ew_SnapshotTreeView.register();
