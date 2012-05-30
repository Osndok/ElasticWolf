var ew_DhcpoptsTreeView = {
    COLNAMES:
    ['dhcpoption.id', 'dhcpoption.options', 'dhcpoption.tag'],
    imageIdRegex : new RegExp("^(dhcp-option|dopt)-"),

    getSearchText : function() {
        return document.getElementById('ew.dhcpopts.search').value;
    },

    refresh : function() {
        
        ew_session.controller.describeDhcpOptions();
        
    },

    invalidate : function() {
        var target = ew_DhcpoptsTreeView;
        target.displayImages(target.filterImages(ew_model.dhcpOptions));
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
            ew_model.registerInterest(this, 'dhcpOptions');
        }
    },

    displayImages : function (imageList) {
        BaseImagesView.displayImages.call(this, imageList);
    },

    enableOrDisableItems : function() {
        var image = this.getSelectedImage();
        document.getElementById("ew.dhcpopts.contextmenu").disabled = (image == null);
    },

    deleteDhcpOptions : function() {
        var opts = this.getSelectedImage();
        if (opts == null) return;

        var confirmed = confirm("Delete " + opts.id + (opts.tag == null ? '' : " [" + opts.tag + "]") + "?");
        if (!confirmed) return;

        var me = this;
        var wrap = function() { 
            me.refresh();
            me.selectByImageId(opts.id);
        }
        ew_session.controller.deleteDhcpOptions(opts.id, wrap);
    },

    createDhcpOptions : function () {
        var retVal = {ok:null, opts:null}
        window.openDialog("chrome://ew/content/dialogs/create_dhcp_options.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);

        if (retVal.ok) {
            
            var me = this;
            var wrap = function(id) {
                me.refresh();
                me.selectByImageId(id);
            }
            ew_session.controller.createDhcpOptions(
                retVal.opts,
                wrap
            );

            
        }
    },
};

// poor-man's inheritance
ew_DhcpoptsTreeView.__proto__ = BaseImagesView;

ew_DhcpoptsTreeView.register();
