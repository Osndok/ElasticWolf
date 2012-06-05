var ew_ReservedInstancesTreeView = {
    COLNAMES: ['rsvdInst.id','rsvdInst.instanceType','rsvdInst.tenancy','rsvdInst.azone','rsvdInst.start','rsvdInst.duration','rsvdInst.fixedPrice','rsvdInst.usagePrice','rsvdInst.count','rsvdInst.description','rsvdInst.state'],
    model: 'reservedInstances',
    searchElement: 'ew.rsvdInst.search',

    viewDetails : function(event) {
        var image = this.getSelected();
        if (image == null) return;
        window.openDialog("chrome://ew/content/dialogs/details_reserved_instances.xul", null, "chrome,centerscreen,modal,resizable", image);
    },

    isRefreshable: function() {
        for (var i in this.treeList) {
            if (list[i].state == "payment-pending") return true;
        }
        return false;
    },
};

ew_ReservedInstancesTreeView.__proto__ = TreeView;
ew_ReservedInstancesTreeView.register();

var ew_LeaseOfferingsTreeView = {
    COLNAMES: [ 'offering.id', 'offering.instanceType', 'offering.azone', 'offering.duration', 'offering.fixedPrice', 'offering.usagePrice', 'offering.offering', 'offering.tenancy', 'offering.description' ],
    model: 'offerings',
    searchElement: 'ew.offerings.search',

    viewDetails : function(event)
    {
        var image = this.getSelected();
        if (image == null) return;
        window.openDialog("chrome://ew/content/dialogs/details_offering.xul", null, "chrome,centerscreen,modal,resizable", image);
    },

    purchaseOffering : function()
    {
        var retVal = { ok : null, id : null, count : null };
        var image = this.getSelected();
        if (image == null) return;
        retVal.id = image.id;
        var fRepeat = true;

        while (fRepeat) {
            // Hand off receiving user input to a dialog
            window.openDialog("chrome://ew/content/dialogs/purchase_offering.xul", null, "chrome,centerscreen,modal,resizable", image, retVal);

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
                    // The user wants to purchase this offering purchase this lease offering
                    ew_session.controller.purchaseOffering(retVal.id, retVal.count, function(id) { ew_ReservedInstancesTreeView.refresh(); });
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
};

ew_LeaseOfferingsTreeView.__proto__ = TreeView;
ew_LeaseOfferingsTreeView.register();
