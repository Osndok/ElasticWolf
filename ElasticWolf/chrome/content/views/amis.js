var ew_AMIsTreeView = {
    COLNAMES : [ 'ami.id', 'ami.location', 'ami.state', 'ami.owner', 'ami.ownerAlias', 'ami.isPublic', 'ami.arch', 'ami.platform', 'ami.rootDeviceType', 'ami.name', 'ami.description', 'ami.tag' ],
    model : ['images','securityGroups','instances'],
    searchElement: "ew.images.search",

    activate: function() {
        $('ew.images.search').value = ew_prefs.getStringPreference(ew_prefs.IMAGES_FILTER, "");
        $('ew.images.type').value = ew_prefs.getStringPreference(ew_prefs.IMAGES_TYPE, "all");
        this.invalidate();
    },

    enableOrDisableItems : function(event)
    {
        var image = this.getSelected();
        var fDisabled = (image == null);

        if (fDisabled) {
            $("ew.images.contextmenu").hidePopup();
            return;
        }

        fDisabled = !isWindows(image.platform);

        // If this is not a Windows Instance, Disable the following
        // context menu items.
        $("amis.context.migrate").disabled = fDisabled;

        // These items apply only to AMIs
        fDisabled = !(image.id.match(regExs["ami"]));
        $("amis.context.register").disabled = fDisabled;
        $("amis.context.deregister").disabled = fDisabled;
        $("amis.context.launch").disabled = fDisabled;
        $("amis.context.delete").disabled = fDisabled;

        // These context menu items don't apply to Windows instancesso enable them.

        // These items don't apply to AMIs with root device type 'ebs'
        if (isEbsRootDeviceType(image.rootDeviceType)) {
            $("amis.context.delete").disabled = true;
            $("amis.context.deleteSnapshotAndDeregister").disabled = false;
        } else {
            $("amis.context.deleteSnapshotAndDeregister").disabled = true;
        }

        var type = $("ew.images.type").value;
        $("amis.context.fadd").disabled = type == "fav";
        $("amis.context.fdelete").disabled = type != "fav";
    },

    imageTypeChanged : function()
    {
        $("ew.images.search").value = "";
        ew_prefs.setStringPreference(ew_prefs.IMAGES_FILTER, $("ew.images.search").value);
        ew_prefs.setStringPreference(ew_prefs.IMAGES_TYPE, $('ew.images.type').value);
        this.invalidate();
    },

    manageFavorites: function(remove) {
        var image = this.getSelected();
        if (image == null) return;
        var favs = ew_prefs.getStringPreference(ew_prefs.AMI_FAVORITES, "").split("^");
        debug(remove + ":" + favs)
        if (remove) {
            var i = favs.indexOf(image.id)
            if (i > -1) {
                favs.splice(i, 1)
            }
        } else {
            if (favs.indexOf(image.id) == -1) {
                favs.push(image.id)
            }
        }
        ew_prefs.setStringPreference(ew_prefs.AMI_FAVORITES, favs.join("^"));
        if (remove) {
            this.invalidate();
        }
    },

    filter: function(list)
    {
        if (!list) return list;
        var type = $("ew.images.type");
        if (type.value == "fav") {
            var favs = ew_prefs.getStringPreference(ew_prefs.AMI_FAVORITES, "").split("^");
            var images = [];
            for (var i in list) {
                if (favs.indexOf(list[i].id) >= 0) {
                    images.push(list[i])
                }
            }
            return TreeView.filter.call(this, images);
        }

        // Initialize the owner display filter to the empty string
        var alias = null, owner = null, root = null, rx = null;
        if (type.value == "my_ami" || type.value == "my_ami_rdt_ebs") {
            var groups = ew_model.getSecurityGroups();
            if (groups) {
                owner = groups[0].ownerId;
                rx = regExs["ami"];
                root = type.value == "my_ami" ? null : "ebs";
            }
        } else
        if (type.value == "amzn" || type.value == "amzn_rdt_ebs") {
            alias = "amazon";
            root = type.value == "amzn" ? null : "ebs";
        } else
        if (type.value == "rdt_ebs") {
            root = "ebs";
        } else
        if (type.value == "rdt_is") {
            root = "instance-store";
        } else {
            rx = regExs[type.value || "all"];
        }
        debug(type.value + " " + alias + " " + owner + " " + root + " " + rx)
        var nlist = new Array();
        for (var i in list) {
            if (rx && !list[i].id.match(rx)) continue;
            if (root && root != list[i].rootDeviceType) continue;
            if (alias && alias != list[i].ownerAlias) continue;
            if (owner && owner != list[i].owner) continue;
            nlist.push(list[i])
        }
        return TreeView.filter.call(this, nlist);
    },

    searchChanged : function(event)
    {
        ew_prefs.setStringPreference(ew_prefs.IMAGES_FILTER, $(this.searchElement).value);
        TreeView.searchChanged.call(this, event);
    },

    newInstanceCallback : function(list)
    {
        var tag = ew_AMIsTreeView.newInstanceTag;
        // Reset the saved tag
        ew_AMIsTreeView.newInstance = "";
        if (tag && tag.length > 0) {
            var inst = null;
            for (var i in list) {
                inst = list[i];
                inst.tag = tag;
                ew_session.setResourceTag(inst.id, tag);
                ew_session.setTags([ inst.id ], tag);
            }
        }
        ew_InstancesTreeView.refresh();
        ew_InstancesTreeView.selectByInstanceIds(list);
        ew_session.selectTab('ew.tabs.instance');
    },

    launchNewInstances : function()
    {
        var image = this.getSelected();
        if (image == null) return;
        var retVal = { ok : null };
        this.newInstanceTag = null;

        window.openDialog("chrome://ew/content/dialogs/create_instances.xul", null, "chrome,centerscreen,modal,resizable", image, ew_session, retVal);

        if (retVal.ok) {
            this.newInstanceTag = retVal.tag || "";
            if (retVal.name) {
                this.newInstanceTag += "Name:" + retVal.name;
            }
            ew_session.controller.runInstances(retVal.imageId, retVal.kernelId, retVal.ramdiskId, retVal.minCount, retVal.maxCount, retVal.keyName, retVal.securityGroups,
                    retVal.userData, retVal.properties, retVal.instanceType, retVal.placement, retVal.subnetId, retVal.ipAddress, this.newInstanceCallback);
        }
    },

    callRegisterImageInRegion : function(manifest, region)
    {
        var me = this;
        var wrap = function(x)
        {
            me.refresh();
            alert("Image with Manifest: " + manifest + " was registered");
        }
        ew_session.controller.registerImageInRegion(manifest, region, wrap);
    },

    registerNewImage : function()
    {
        var me = this;
        var retVal = {  ok : null, manifestPath : null };
        window.openDialog("chrome://ew/content/dialogs/register_image.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);

        if (retVal.ok) {
            var s3bucket = retVal.manifestPath.split('/')[0];
            var bucketReg = ew_session.controller.getS3BucketLocation(s3bucket, function(bucket, region) {
                me.callRegisterImageInRegion(retVal.manifestPath, region);
            });
        }
    },

    deregisterImage : function(fDelete)
    {
        var image = this.getSelecteed();
        if (!image) return;
        if (fDelete == undefined) {
            fDelete = confirm("Deregister AMI " + image.id + " (" + image.location + ")?");
        }
        if (!fDelete) return;
        var me = this;
        ew_session.controller.deregisterImage(image.id, function() {me.refresh()});
    },

    migrateImage : function()
    {
        var image = this.getSelected();
        if (image == null) return;
        if (this.currentlyMigrating && this.amiBeingMigrated == image.id) {
            alert("This AMI is currently being migrated!");
            return;
        }

        alert("Not implemented yet");
        return;

        var retVal = { ok : null };
        window.openDialog("chrome://ew/content/dialogs/migrate_ami.xul", null, "chrome,centerscreen,modal,resizable", image, ew_session, retVal);
        if (retVal.ok) {
            this.currentlyMigrating = true;
            this.amiBeingMigrated = image.id;
            retVal.ok = false;
            // TODO: Finish up AMI migration with visual prompts
            //window.openDialog("chrome://ew/content/dialogs/copy_S3_keys.xul", null, "chrome, dialog, centerscreen, resizable=yes", ew_session, retVal);
        }
    },

    finishMigration : function(retVal)
    {
        if (retVal.ok) {
            // Register the new AMI
            var manifest = retVal.destB + "/" + retVal.prefix + ".manifest.xml";
            log("Registering AMI with manifest: " + manifest);
            this.callRegisterImageInRegion(manifest, retVal.region);
        }
        this.currentlyMigrating = false;
        this.amiBeingMigrated = null;
    },

    deleteImage : function()
    {
        var image = this.getSelected();
        if (image == null) return;

        if (this.currentlyMigrating && this.amiBeingMigrated == image.id) {
            alert("This AMI is currently being migrated. Please try *Deleting* it after the Migration.");
            return;
        }

        if (confirm("Are you sure you want to delete this AMI and all its parts from S3? The AMI will be deregistered as well.")) {
            var retVal = { ok : null };
            window.openDialog("chrome://ew/content/dialogs/delete_ami.xul", null, "chrome,centerscreen,modal,resizable", ew_session, image.location, retVal);
            if (retVal.ok) {
                // Keys have been deleted. Let's deregister this image
                this.deregisterImage(true);
            }
        }
    },

    deleteSnapshotAndDeregister : function()
    {
        var image = this.getSelected();
        if (image == null) return;

        var ami = image.id;
        var snapshot = image.snapshotId;
        if (confirm("Are you sure you want to delete this AMI (" + ami + ") " + "and the accompanying snapshot (" + snapshot + ")?")) {
            var me = this;
            var wrap = function()
            {
                ew_session.controller.deleteSnapshot(snapshot, function() { ew_SnapshotTreeView.refresh() });
                me.refresh();
            }
            ew_session.controller.deregisterImage(ami, wrap);
        }
    },

    viewDetails : function(event) {
        var image = this.getSelected();
        if (image == null) return;
        window.openDialog("chrome://ew/content/dialogs/details_ami.xul", null, "chrome,centerscreen,modal,resizable", image);
    },

    viewPermissions: function()
    {
        var image = this.getSelected();
        if (image == null) {
            return;
        }
        window.openDialog("chrome://ew/content/dialogs/ami_permissions.xul", null, "chrome,centerscreen,modal,resizable", ew_session, image);
    },
};

ew_AMIsTreeView.__proto__ = TreeView;
ew_AMIsTreeView.register();
