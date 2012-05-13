var ew_VpcTreeView = {
    COLNAMES : [ 'vpc.id', 'vpc.cidr', 'vpc.state', 'vpc.dhcpoptions', 'vpc.tag' ],
    imageIdRegex : new RegExp("^(cloud|vpc)-"),

    getSearchText : function()
    {
        return document.getElementById('ew.vpcs.search').value;
    },

    refresh : function(isSync)
    {
        ew_session.showBusyCursor(true);
        ew_session.controller.describeVpcs(isSync);
        // For the attachment call
        ew_session.controller.describeVpnGateways();
        ew_session.showBusyCursor(false);
    },

    invalidate : function()
    {
        var target = ew_VpcTreeView;
        target.displayImages(target.filterImages(ew_model.vpcs));
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
            ew_model.registerInterest(this, 'vpcs');
        }
    },

    displayImages : function(imageList)
    {
        BaseImagesView.displayImages.call(this, imageList);
    },

    enableOrDisableItems : function()
    {
        var image = this.getSelectedImage();
        document.getElementById("ew.vpcs.contextmenu").disabled = (image == null);
    },

    createSubnet : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        ew_SubnetTreeView.createSubnet(vpc.id);
    },

    createVpc : function()
    {
        var retVal = {
            ok : null,
            cidr : null,
            dhcpOptionsId : null
        }
        window.openDialog("chrome://ew/content/dialog_create_vpc.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);

        if (retVal.ok) {
            ew_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id)
            {
                me.refresh(true);
                me.selectByImageId(id);
                ew_InternetGatewayTreeView.attachInternetGateway(id, null);
            }
            ew_session.controller.createVpc(retVal.cidr, wrap);
            ew_session.showBusyCursor(false);
        }
    },

    deleteVpc : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        var instances = ew_model.instances;
        for (var i = 0; i < instances.length; i++) {
            if (instances[i].vpcId == vpc.id && instances[i].state == "running") {
                alert("There is instance " + instances[i].id + "/" + instances[i].name + " still running in this VPC");
                return;
            }
        }

        var confirmed = confirm("Delete " + vpc.id + " (" + vpc.cidr + ")" + (vpc.tag == null ? '' : " [" + vpc.tag + "]") + "?");
        if (!confirmed) return;

        var me = this;
        var wrap = function(id)
        {
            me.refresh();
            me.selectByImageId(id);
        }
        ew_session.controller.deleteVpc(vpc.id, wrap);
    },

    setDhcpOptions : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        var retVal = {
            ok : null,
            vpcId : vpc.id,
            dhcpOptionsId : null
        };
        window.openDialog("chrome://ew/content/dialog_associate_dhcp_options.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);

        if (retVal.ok) {
            ew_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id)
            {
                me.refresh();
                me.selectByImageId(id);
            }
            ew_session.controller.associateDhcpOptions(retVal.dhcpOptionsId, retVal.vpcId, wrap);
            ew_session.showBusyCursor(false);
        }
    },

    attachToVpnGateway : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        ew_VpnAttachmentTreeView.attachToVpc(vpc.id, null);
    },

    attachToInternetGateway : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        ew_InternetGatewayTreeView.attachInternetGateway(vpc.id, null);
    },
};
ew_VpcTreeView.__proto__ = BaseImagesView;
ew_VpcTreeView.register();

var ew_SubnetTreeView = {
    COLNAMES : [ 'subnet.id', 'subnet.vpcId', 'subnet.cidr', 'subnet.state', 'subnet.availableIp', 'subnet.availabilityZone', 'subnet.tag' ],
    imageIdRegex : new RegExp("^subnet-"),

    getSearchText : function()
    {
        return document.getElementById('ew.subnets.search').value;
    },

    refresh : function()
    {
        ew_session.showBusyCursor(true);
        ew_session.controller.describeSubnets();
        ew_session.showBusyCursor(false);
    },

    invalidate : function()
    {
        var target = ew_SubnetTreeView;
        target.displayImages(target.filterImages(ew_model.subnets));
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
            ew_model.registerInterest(this, 'subnets');
        }
    },

    displayImages : function(imageList)
    {
        BaseImagesView.displayImages.call(this, imageList);
    },

    enableOrDisableItems : function()
    {
        var image = this.getSelectedImage();
        document.getElementById("ew.subnets.contextmenu").disabled = (image == null);
    },

    deleteSubnet : function()
    {
        var subnet = this.getSelectedImage();
        if (subnet == null) return;

        var confirmed = confirm("Delete " + subnet.id + " (" + subnet.cidr + ")" + (subnet.tag == null ? '' : " [" + subnet.tag + "]") + "?");
        if (!confirmed) return;

        var me = this;
        var wrap = function(id)
        {
            me.refresh();
            me.selectByImageId(id);
        }
        ew_session.controller.deleteSubnet(subnet.id, wrap);
    },

    createSubnet : function(vpc)
    {
        var retVal = {
            ok : null,
            cidr : null,
            vpcid : vpc,
            az : null
        }
        window.openDialog("chrome://ew/content/dialog_create_subnet.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);

        if (retVal.ok) {
            ew_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id)
            {
                me.refresh();
                me.selectByImageId(id);
            }
            ew_session.controller.createSubnet(retVal.vpcid, retVal.cidr, retVal.az, wrap);

            ew_session.showBusyCursor(false);
        }
    },
};
ew_SubnetTreeView.__proto__ = BaseImagesView;
ew_SubnetTreeView.register();
