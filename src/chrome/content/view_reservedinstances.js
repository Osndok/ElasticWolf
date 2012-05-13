var ew_ReservedInstancesTreeView = {
    COLNAMES: ['rsvdInst.id',
               'rsvdInst.instanceType',
               'rsvdInst.tenancy',
               'rsvdInst.azone',
               'rsvdInst.start',
               'rsvdInst.duration',
               'rsvdInst.fixedPrice',
               'rsvdInst.usagePrice',
               'rsvdInst.count',
               'rsvdInst.description',
               'rsvdInst.state'],
    imageIdRegex : new RegExp(".*"),

    getSearchText : function() {
        return document.getElementById('ew.rsvdInst.search').value;
    },

    refresh : function() {
        ew_session.showBusyCursor(true);
        ew_session.controller.describeReservedInstances();
        ew_session.showBusyCursor(false);
    },

    invalidate : function() {
        var target = ew_ReservedInstancesTreeView;
        target.displayImages(target.filterImages(ew_model.reservedInstances));
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
            ew_model.registerInterest(this, 'reservedInstances');
        }
    },

    viewDetails : function(event) {
        var image = this.getSelectedImage();
        if (image == null) return;
        window.openDialog("chrome://ew/content/dialog_reserved_instances_details.xul", null, "chrome,centerscreen,modal,resizable", image);
    },

    displayImages : function (imageList) {
        if (ew_prefs.isRefreshOnChangeEnabled()) {
        // Determine if there are any pending operations
        if (this.pendingUpdates()) {
            this.startRefreshTimer("ew_ReservedInstancesTreeView", ew_ReservedInstancesTreeView.refresh);
        } else {
            this.stopRefreshTimer("ew_ReservedInstancesTreeView");
        }
    } else {
        this.stopRefreshTimer("ew_ReservedInstancesTreeView");
    }

    BaseImagesView.displayImages.call(this, imageList);
    },

    pendingUpdates : function() {
        // Walk the list of reservedInst to see whether the
        // state of any of them needs to be refreshed
        var list = ew_session.model.reservedInstances;
        var fPending = false;

        if (list == null) {
            return fPending;
        }

        for (var i in list) {
            if (list[i].state == "payment-pending") {
                fPending = true;
                break;
            }
        }

        return fPending;
    },
};

// poor-man's inheritance
ew_ReservedInstancesTreeView.__proto__ = BaseImagesView;

ew_ReservedInstancesTreeView.register();
