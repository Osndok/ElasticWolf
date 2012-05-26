var ew_LeaseOfferingsTreeView = { COLNAMES :
    [ 'offering.id', 'offering.instanceType', 'offering.azone', 'offering.duration', 'offering.fixedPrice', 'offering.usagePrice', 'offering.offering', 'offering.tenancy', 'offering.description' ],

    imageIdRegex : new RegExp(".*"),

    getSearchText : function()
    {
        return document.getElementById('ew.offerings.search').value;
    },

    refresh : function()
    {
        
        ew_session.controller.describeLeaseOfferings();
        
    },

    invalidate : function()
    {
        var target = ew_LeaseOfferingsTreeView;
        target.displayImages(target.filterImages(ew_model.offerings));
    },

    searchChanged : function(event)
    {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }

        this.searchTimer = setTimeout(this.invalidate, 500);
    },

    register : function()
    {
        if (!this.registered) {
            this.registered = true;
            ew_model.registerInterest(this, 'offerings');
        }
    },

    displayImages : function(imageList)
    {
        // Determine if there are any pending operations
        if (this.pendingUpdates()) {
            this.startRefreshTimer("", ew_LeaseOfferingsTreeView.refresh);
        } else {
            this.stopRefreshTimer("ew_LeaseOfferingsTreeView");
        }
        BaseImagesView.displayImages.call(this, imageList);
    },

    viewDetails : function(event)
    {
        var image = this.getSelectedImage();
        if (image == null) return;
        window.openDialog("chrome://ew/content/dialog_offering_details.xul", null, "chrome,centerscreen,modal,resizable", image);
    },

    purchaseOffering : function()
    {
        var retVal = { ok : null, id : null, count : null };
        var image = this.getSelectedImage();
        if (image == null) return;
        retVal.id = image.id;
        var fRepeat = true;

        while (fRepeat) {
            // Hand off receiving user input to a dialog
            window.openDialog("chrome://ew/content/dialog_purchase_offering.xul", null, "chrome,centerscreen,modal,resizable", image, retVal);

            fRepeat = retVal.ok;
            if (retVal.ok) {
                // Ensure that the user actually wants to purchase this offering
                var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
                var check = null;
                var flags = prompts.BUTTON_TITLE_IS_STRING * prompts.BUTTON_POS_0 + prompts.BUTTON_TITLE_IS_STRING * prompts.BUTTON_POS_1 + prompts.BUTTON_TITLE_CANCEL * prompts.BUTTON_POS_2 + prompts.BUTTON_POS_0_DEFAULT;

                var msg = "You are about to purchase " + retVal.count;
                msg = msg + " " + image.description + " Reserved Instance(s)";
                msg = msg + " in the " + image.azone;
                msg = msg + " Availability Zone for $";
                msg = msg + retVal.count * parseInt(image.fixedPrice);
                msg = msg + ". Are you sure?\n\nAn email will be sent to you shortly after we receive your order.";

                var button = prompts.confirmEx(window, "Confirm Reserved Instances Offering Purchase", msg, flags, "Edit Order", "Place Order", "", null, {});

                // Edit: 0
                // Purchase: 1
                // Cancel: 2
                if (button == 1) {
                    fRepeat = false;
                    // The user wants to purchase this offering
                    var wrap = function(id)
                    {
                        ew_ReservedInstancesTreeView.refresh();
                        ew_ReservedInstancesTreeView.selectByImageId(id);
                    }

                    // purchase this lease offering
                    ew_session.controller.purchaseOffering(retVal.id, retVal.count, wrap);
                } else
                    if (button == 0) {
                        // The user wants to edit the order
                        continue;
                    } else {
                        fRepeat = false;
                    }
            }
        }
    },

    pendingUpdates : function()
    {
        return false;
    },

};

// poor-man's inheritance
ew_LeaseOfferingsTreeView.__proto__ = BaseImagesView;

ew_LeaseOfferingsTreeView.register();
