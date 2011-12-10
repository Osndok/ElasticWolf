var ec2ui_VpcTreeView = {
    COLNAMES : [ 'vpc.id', 'vpc.cidr', 'vpc.state', 'vpc.dhcpoptions', 'vpc.tag' ],
    imageIdRegex : new RegExp("^(cloud|vpc)-"),

    getSearchText : function()
    {
        return document.getElementById('ec2ui.vpcs.search').value;
    },

    refresh : function(isSync)
    {
        ec2ui_session.showBusyCursor(true);
        ec2ui_session.controller.describeVpcs(isSync);
        // For the attachment call
        ec2ui_session.controller.describeVpnGateways();
        ec2ui_session.showBusyCursor(false);
    },

    invalidate : function()
    {
        var target = ec2ui_VpcTreeView;
        target.displayImages(target.filterImages(ec2ui_model.vpcs));
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
            ec2ui_model.registerInterest(this, 'vpcs');
        }
    },

    displayImages : function(imageList)
    {
        BaseImagesView.displayImages.call(this, imageList);
    },

    enableOrDisableItems : function()
    {
        var image = this.getSelectedImage();
        document.getElementById("ec2ui.vpcs.contextmenu").disabled = (image == null);
    },

    createSubnet : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        ec2ui_SubnetTreeView.createSubnet(vpc.id);
    },

    createVpc : function()
    {
        var retVal = {
            ok : null,
            cidr : null,
            dhcpOptionsId : null
        }
        window.openDialog("chrome://ec2ui/content/dialog_create_vpc.xul", null, "chrome,centerscreen,modal,resizable", ec2ui_session, retVal);

        if (retVal.ok) {
            ec2ui_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id)
            {
                me.refresh(true);
                me.selectByImageId(id);
                ec2ui_InternetGatewayTreeView.attachInternetGateway(id, null);
            }
            ec2ui_session.controller.createVpc(retVal.cidr, wrap);
            ec2ui_session.showBusyCursor(false);
        }
    },

    deleteVpc : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        var instances = ec2ui_model.instances;
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
        ec2ui_session.controller.deleteVpc(vpc.id, wrap);
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
        window.openDialog("chrome://ec2ui/content/dialog_associate_dhcp_options.xul", null, "chrome,centerscreen,modal,resizable", ec2ui_session, retVal);

        if (retVal.ok) {
            ec2ui_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id)
            {
                me.refresh();
                me.selectByImageId(id);
            }
            ec2ui_session.controller.associateDhcpOptions(retVal.dhcpOptionsId, retVal.vpcId, wrap);
            ec2ui_session.showBusyCursor(false);
        }
    },

    attachToVpnGateway : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        ec2ui_VpnAttachmentTreeView.attachToVpc(vpc.id, null);
    },

    attachToInternetGateway : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        ec2ui_InternetGatewayTreeView.attachInternetGateway(vpc.id, null);
    },
};
ec2ui_VpcTreeView.__proto__ = BaseImagesView;
ec2ui_VpcTreeView.register();

var ec2ui_SubnetTreeView = {
    COLNAMES : [ 'subnet.id', 'subnet.vpcId', 'subnet.cidr', 'subnet.state', 'subnet.availableIp', 'subnet.availabilityZone', 'subnet.tag' ],
    imageIdRegex : new RegExp("^subnet-"),

    getSearchText : function()
    {
        return document.getElementById('ec2ui.subnets.search').value;
    },

    refresh : function()
    {
        ec2ui_session.showBusyCursor(true);
        ec2ui_session.controller.describeSubnets();
        ec2ui_session.showBusyCursor(false);
    },

    invalidate : function()
    {
        var target = ec2ui_SubnetTreeView;
        target.displayImages(target.filterImages(ec2ui_model.subnets));
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
            ec2ui_model.registerInterest(this, 'subnets');
        }
    },

    displayImages : function(imageList)
    {
        BaseImagesView.displayImages.call(this, imageList);
    },

    enableOrDisableItems : function()
    {
        var image = this.getSelectedImage();
        document.getElementById("ec2ui.subnets.contextmenu").disabled = (image == null);
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
        ec2ui_session.controller.deleteSubnet(subnet.id, wrap);
    },

    createSubnet : function(vpc)
    {
        var retVal = {
            ok : null,
            cidr : null,
            vpcid : vpc,
            az : null
        }
        window.openDialog("chrome://ec2ui/content/dialog_create_subnet.xul", null, "chrome,centerscreen,modal,resizable", ec2ui_session, retVal);

        if (retVal.ok) {
            ec2ui_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id)
            {
                me.refresh();
                me.selectByImageId(id);
            }
            ec2ui_session.controller.createSubnet(retVal.vpcid, retVal.cidr, retVal.az, wrap);

            ec2ui_session.showBusyCursor(false);
        }
    },
};
ec2ui_SubnetTreeView.__proto__ = BaseImagesView;
ec2ui_SubnetTreeView.register();
