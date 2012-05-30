function getEC2WindowsDeviceList() {
    var devlist = new Array();
    devlist["xvdg"] = "xvdg";
    devlist["xvdh"] = "xvdh";
    devlist["xvdi"] = "xvdi";
    devlist["xvdj"] = "xvdj";
    devlist["xvdk"] = "xvdk";
    devlist["xvdl"] = "xvdl";
    devlist["xvdm"] = "xvdm";
    devlist["xvdn"] = "xvdn";
    devlist["xvdo"] = "xvdo";
    devlist["xvdp"] = "xvdp";
    devlist["xvdf"] = "xvdf";
    devlist["xvde"] = "xvde";
    devlist["xvdd"] = "xvdd";
    devlist["xvdc"] = "xvdc";
    return devlist;
};

var ew_VolumeTreeView = {
    COLNAMES:
    ['vol.id','vol.size','vol.snapshotId','vol.availabilityZone','vol.status',
    'vol.createTime', 'vol.instanceId', 'vol.instanceName', 'vol.device', 'vol.attachStatus',
    'vol.attachTime', 'vol.tag'],
    imageIdRegex : new RegExp("^vol-"),

    getSearchText : function() {
        return document.getElementById('ew.volumes.search').value;
    },

    refresh : function() {

        ew_session.controller.describeVolumes();

    },

    invalidate : function() {
        var target = ew_VolumeTreeView;
        var list = (ew_model.volumes || []);
        var filterRootDev = document.getElementById("ew.volumes.norootdev").checked;

        if (filterRootDev) {
          var newList = [];

          for (var i = 0; i < list.length; i++) {
            var volume = list[i];

            if (volume.device != '/dev/sda1') {
              newList.push(volume);
            }
          }

          list = newList;
        }

        target.displayImages(target.filterImages(list));
    },

    searchChanged : function(event) {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }

        this.searchTimer = setTimeout(this.invalidate, 500);
    },

    register : function() {
        if (!this.registered) {
            this.registered = true;
            ew_model.registerInterest(this, 'volumes');
        }
    },

    displayImages : function (imageList) {
        // Determine if there are any pending operations
        if (this.pendingUpdates()) {
            this.startRefreshTimer("",  this.refresh);
        } else {
            this.stopRefreshTimer("ew_VolumeTreeView");
        }
        BaseImagesView.displayImages.call(this, imageList);
    },

    viewDetails : function(event) {
        var image = this.getSelectedImage();
        if (image == null) return;
        window.openDialog("chrome://ew/content/dialogs/details_volume.xul", null, "chrome,centerscreen,modal,resizable", image);
    },

    enableOrDisableItems : function() {
        var image = this.getSelectedImage();
        document.getElementById("ew.volumes.contextmenu").disabled = (image == null);

        if (image == null) return;

        var fAssociated = true;
        if (image.status == "available") {
            // There is no instance associated with this volume
            fAssociated = false;
        }

        // If this is not a Windows Instance, Disable the following
        // context menu items.
        document.getElementById("volumes.context.attach").disabled = fAssociated;
        document.getElementById("volumes.context.detach").disabled = !fAssociated;
        document.getElementById("volumes.context.forcedetach").disabled = !fAssociated;
    },

    createSnapshot : function () {
        var image = this.getSelectedImage();
        if (image == null) return;
        var me = this;
        var wrap = function(snapId) {
            // Replicate the volume tag for this snapshot
            var tag = me.getSelectedImage().tag;
            if (tag && tag.length > 0) {
                ew_session.setResourceTag(snapId, tag);
            }
            // We need to refresh so that the tag is applied to the snapshot
            ew_SnapshotTreeView.refresh();
            ew_SnapshotTreeView.selectByImageId(snapId);
        }
        ew_session.controller.createSnapshot(image.id, wrap);
    },

    createVolume : function (snap) {
        var retVal = {ok:null};
        if (!snap) snap = null;
        window.openDialog("chrome://ew/content/dialogs/create_volume.xul",
                          null,
                          "chrome,centerscreen,modal,resizable",
                          snap,
                          ew_session,
                          retVal);
        if (retVal.ok) {
            var me = this;
            var wrap = function(id) {
                me.refresh();
                document.getElementById('ew.volumes.search').value = '';
                me.invalidate();
                me.selectByImageId(id);
            }
            ew_session.controller.createVolume(retVal.size,
                                                  retVal.snapshotId,
                                                  retVal.zone,
                                                  wrap);

            // Let's tag this volume
            if (retVal.tag) {
                var vol = this.getSelectedImage();
                if (vol) {
                    vol.tag = retVal.tag;
                    ew_session.setResourceTag(vol.id, vol.tag);
                    __tagging2ec2__([vol.id], ew_session, vol.tag);
                    me.refresh();
                }
            }
        }

        return retVal.ok;
    },

    deleteVolume : function () {
        var image = this.getSelectedImage();
        if (image == null) return;
        var label = image.name ? (image.name + '@' + image.id) : image.id;
        var confirmed = confirm("Delete volume " + label + "?");
        if (!confirmed)
            return;
        var wrap = function() {
            ew_VolumeTreeView.refresh();
        }
        ew_session.controller.deleteVolume(image.id, wrap);
    },

    attachEBSVolume : function (volumeId, instId, device) {
         if (device == "windows_device") {
            // The device id needs to be determined
            device = this.determineWindowsDevice(instId);
        }

        log("Device Selected for instance: " + device);

        var me = this;
        var wrap = function() {
            me.refresh();
        }
        ew_session.controller.attachVolume(volumeId, instId, device, wrap);
    },

    attachVolume : function () {
        var image = this.getSelectedImage();
        if (image == null) return;
        var retVal = {ok:null};
        while (true) {
            window.openDialog("chrome://ew/content/dialogs/create_attachment.xul",
                              null,
                              "chrome,centerscreen,modal,resizable",
                              image,
                              ew_session,
                              retVal);
            if (retVal.ok) {
                // If this is a Windows instance,
                // the device should be windows_device
                // and the instance should be ready to use
                var instances = ew_session.model.getInstances();
                var instance = null;
                for (var i in instances) {
                    instance = instances[i];
                    if (instance.id == retVal.instanceId) {
                        if (!ew_InstancesTreeView.isInstanceReadyToUse(instance)) {
                            // The selected instance is not ready to
                            // use. Repeat.
                            continue;
                        }
                        if (isWindows(instance.platform)) {
                            retVal.device = "windows_device";
                        }
                        // The 2 if conditions aren't folded into 1
                        // so that we can break upon finding the instance
                        // id match.
                        break;
                    }
                }
                this.attachEBSVolume(retVal.volumeId,
                                     retVal.instanceId,
                                     retVal.device);
            }
            break;
        }
    },

    determineWindowsDevice : function (instId) {
        // Need to walk through the list of Volumes
        // If any volume is attached to this instance,
        // that device id is removed from the list of
        // possible device ids for this instance.
        var devList = getEC2WindowsDeviceList();

        // Enumerate the volumes associated with the instId
        var volumes = ew_session.model.volumes;

        // If a volume is associated with this instance, mark
        // the associated device as taken
        for (var i in volumes) {
            if (volumes[i].instanceId == instId) {
                // We have a match
                log("This device " + volumes[i].device +
                    " is taken by volume: " + volumes[i].id);
                devList[volumes[i].device] = 1;
            }
        }

        for (var device in devList) {
            if (devList[device] != 1) {
                return devList[device];
            }
        }

        return "";
    },

    detachVolume : function () {
        var image = this.getSelectedImage();
        if (image == null) return;
        var confirmed = confirm("Detach volume " + image.id + "?");
        if (!confirmed)
            return;
        var wrap = function() {
            ew_VolumeTreeView.refresh();
        }
        ew_session.controller.detachVolume(image.id, wrap);
    },

    forceDetachVolume : function () {
        var image = this.getSelectedImage();
        if (image == null) return;
        var confirmed = confirm("Force detach volume " + image.id + "?");
        if (!confirmed)
            return;
        var wrap = function() {
            ew_VolumeTreeView.refresh();
        }
        ew_session.controller.forceDetachVolume(image.id, wrap);
    },

    pendingUpdates : function() {
        /*
        // Walk the list of volumes to see whether there is a volume
        // whose state needs to be refreshed
        var volumes = ew_session.model.volumes;
        var fPending = false;

        if (volumes == null) {
            return fPending;
        }

        for (var i in volumes) {
            if (volumes[i].status != "available" &&
                (volumes[i].attachStatus == "attaching" ||
                volumes[i].attachStStatus == "detaching")) {
                fPending = true;
                break;
            }
        }
        */

        return false;
    },
};

// poor-man's inheritance
ew_VolumeTreeView.__proto__ = BaseImagesView;

ew_VolumeTreeView.register();
