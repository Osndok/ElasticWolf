var ew_AMIsTreeView = {
    COLNAMES : [ 'ami.id', 'ami.location', 'ami.state', 'ami.owner', 'ami.ownerAlias', 'ami.isPublic', 'ami.arch', 'ami.platform', 'ami.rootDeviceType', 'ami.name', 'ami.description', 'ami.tag' ],
    imageIdRegex : regExs["all"],
    rootDeviceType : "",
    ownerDisplayFilter : "",

    activate: function() {
        $('ew.images.search').value = ew_prefs.getStringPreference(ew_prefs.IMAGES_FILTER, "");
        $('ew.images.type').value = ew_prefs.getStringPreference(ew_prefs.IMAGES_TYPE, "all");
        this.invalidate();
    },

    enableOrDisableItems : function(event)
    {
        var image = this.getSelectedImage();
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
        this.displayImagesOfType();
    },

    manageFavorites: function(remove) {
        var image = this.getSelectedImage();
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

    invalidate: function() {
        this.displayImagesOfType();
    },

    displayImagesOfType : function()
    {
        var type = $("ew.images.type");
        if (type.value == "fav") {
            var favs = ew_prefs.getStringPreference(ew_prefs.AMI_FAVORITES, "").split("^");
            var images = [];
            for (var i in ew_model.images) {
                if (favs.indexOf(ew_model.images[i].id) >= 0) {
                    images.push(ew_model.images[i])
                }
            }
            this.displayImages(images);
            return
        }

        // Initialize the owner display filter to the empty string
        this.ownerDisplayFilter = "";
        if (type.value == "my_ami" || type.value == "my_ami_rdt_ebs") {
            var groups = ew_model.getSecurityGroups();

            if (groups) {
                var group = groups[0];
                var currentUser = ew_session.lookupAccountId(group.ownerId);
                this.imageIdRegex = regExs["ami"];
                this.rootDeviceType = type.value == "my_ami" ? "" : "ebs";
            }
        } else
        if (type.value == "amzn" || type.value == "amzn_rdt_ebs") {
            this.ownerDisplayFilter = "amazon";
            this.rootDeviceType = type.value == "amzn" ? "" : "ebs";
        } else
        if (type.value == "rdt_ebs") {
            this.rootDeviceType = "ebs";
            this.imageIdRegex = regExs["all"];
        } else
        if (type.value == "rdt_is") {
            this.rootDeviceType = "instance-store";
            this.imageIdRegex = regExs["all"];
        } else {
            this.imageIdRegex = regExs[type.value || "all"];
            this.rootDeviceType = "";
        }

        var images = ew_model.images;
        images = this.filterRootDevice(images);
        images = this.filterOwnerDisplay(images);
        images = this.filterImages(images, currentUser);
        this.displayImages(images);
    },

    filterRootDevice : function(images)
    {
        if (this.rootDeviceType == "") {
            return images;
        }

        var newList = new Array();

        for ( var i in images) {
            var rdt = this.getImageDetail(images[i], "ami.rootDeviceType");
            if (rdt == this.rootDeviceType) {
                newList.push(images[i]);
            }
        }

        return newList;
    },

    filterOwnerDisplay : function(images)
    {
        if (this.ownerDisplayFilter == "") {
            return images;
        }

        var newList = new Array();

        for ( var i in images) {
            if (images[i].ownerAlias == this.ownerDisplayFilter) {
                newList.push(images[i]);
            }
        }

        return newList;
    },

    searchChanged : function(event)
    {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
        var me = this;
        this.searchTimer = setTimeout(function() { me.invalidate(); }, 500);
        ew_prefs.setStringPreference(ew_prefs.IMAGES_FILTER, $("ew.images.search").value);
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
                __tagging2ec2__([ inst.id ], ew_session, tag);
            }
        }
        ew_InstancesTreeView.refresh();
        ew_InstancesTreeView.selectByInstanceIds(list);
        ew_session.selectTab('ew.tabs.instance');
    },

    launchNewInstances : function()
    {
        var image = this.getSelectedImage();
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
            alert("Image with Manifest: " + manifest + " was registered");
            me.refresh();
            me.selectByImageId(x);
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
        var index = this.selection.currentIndex;
        if (index == -1) return;

        var image = this.imageList[index];

        if (fDelete == undefined) {
            fDelete = confirm("Deregister AMI " + image.id + " (" + image.location + ")?");
        }

        if (!fDelete) {
            return;
        }

        var me = this;
        var wrap = function()
        {
            me.refresh();
        }
        log("Deregistering image: " + image.id);
        ew_session.controller.deregisterImage(image.id, wrap);
    },

    migrateImage : function()
    {
        var retVal = {
            ok : null,
            sourceB : null,
            destB : null,
            prefix : null,
            region : null,
            caller : this
        };

        var image = this.getSelectedImage();

        if (image == null) {
            return;
        }

        if (this.currentlyMigrating && this.amiBeingMigrated == image.id) {
            alert("This AMI is currently being migrated!");
            return;
        }

        alert("Not implemented yet");
        return;

        window.openDialog("chrome://ew/content/dialogs/migrate_ami.xul", null, "chrome,centerscreen,modal,resizable", image, ew_session, retVal);

        if (retVal.ok) {
            this.currentlyMigrating = true;
            this.amiBeingMigrated = image.id;

            // Reset the retVal's ok member so the object can be reused
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
        var image = this.getSelectedImage();

        if (image == null) {
            return;
        }

        if (this.currentlyMigrating && this.amiBeingMigrated == image.id) {
            alert("This AMI is currently being migrated. Please try *Deleting* it after the Migration.");
            return;
        }

        var msg = "Are you sure you want to delete this AMI and all its parts from S3?";
        msg = msg + " The AMI will be deregistered as well.";
        var fDelete = confirm(msg);

        if (fDelete) {
            var retVal = {
                ok : null
            };
            window.openDialog("chrome://ew/content/dialogs/delete_ami.xul", null, "chrome,centerscreen,modal,resizable", ew_session, image.location, retVal);

            if (retVal.ok) {
                // Keys have been deleted. Let's deregister this image
                this.deregisterImage(true);
            }
        }
    },

    deleteSnapshotAndDeregister : function()
    {
        var image = this.getSelectedImage();

        if (image == null) {
            return;
        }

        var ami = image.id;
        var snapshot = image.snapshotId;

        var msg = "Are you sure you want to delete this AMI (" + ami + ") " + "and the accompanying snapshot (" + snapshot + ")?";
        var fDelete = confirm(msg);

        if (fDelete) {
            var me = this;
            var snap_wrap = function()
            {
                ew_SnapshotTreeView.refresh();
            }

            var dereg_wrap = function()
            {
                ew_session.controller.deleteSnapshot(snapshot, snap_wrap);
                me.refresh();
            }

            ew_session.controller.deregisterImage(ami, dereg_wrap);
        }
    },

    viewPermissions: function()
    {
        var image = this.getSelectedImage();
        if (image == null) {
            return;
        }
        window.openDialog("chrome://ew/content/dialogs/ami_permissions.xul", null, "chrome,centerscreen,modal,resizable", ew_session, image);
    },

    getSearchText : function()
    {
        return $('ew.images.search').value;
    },
};

// poor-man's inheritance
ew_AMIsTreeView.__proto__ = BaseImagesView;

ew_AMIsTreeView.register();
