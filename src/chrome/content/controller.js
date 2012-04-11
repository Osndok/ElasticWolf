// controller: slightly higher level of abstraction over the EC2 API
var ec2ui_controller = {
    getNsResolver : function()
    {
        return ec2ui_client.getNsResolver();
    },

    registerImageInRegion : function(manifestPath, region, callback)
    {
        // Determine the current region
        var activeReg = ec2ui_utils.determineRegionFromString(ec2ui_session.getActiveEndpoint().name);
        log(activeReg + ": active, requested: " + region);

        if (activeReg == region) {
            // The image's region is the same as the active region
            this.registerImage(manifestPath, callback);
        } else {
            ec2ui_client.queryEC2InRegion(region, "RegisterImage", [ [ "ImageLocation", manifestPath ] ], this, true, "onCompleteRegisterImage", callback);
        }
    },

    registerImage : function(manifestPath, callback)
    {
        ec2ui_client.queryEC2("RegisterImage", [ [ "ImageLocation", manifestPath ] ], this, true, "onCompleteRegisterImage", callback);
    },

    registerImageFromSnapshot : function(snapshotId, amiName, amiDescription, architecture, kernelId, ramdiskId, deviceName, deleteOnTermination, callback)
    {
        var params = [];

        params.push([ 'Name', amiName ]);
        amiDescription && params.push([ 'Description', amiDescription ]);
        params.push([ 'Architecture', architecture ]);
        kernelId && params.push([ 'KernelId', kernelId ]);
        ramdiskId && params.push([ 'RamdiskId', ramdiskId ]);
        params.push([ 'RootDeviceName', deviceName ]);
        params.push([ 'BlockDeviceMapping.1.DeviceName', deviceName ]);
        params.push([ 'BlockDeviceMapping.1.Ebs.SnapshotId', snapshotId ]);
        params.push([ 'BlockDeviceMapping.1.Ebs.DeleteOnTermination', deleteOnTermination ]);

        ec2ui_client.queryEC2("RegisterImage", params, this, true, "onCompleteRegisterImage", callback);
    },

    onCompleteRegisterImage : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var imageId = getNodeValueByName(xmlDoc, "imageId");

        if (objResponse.callback) objResponse.callback(imageId);
    },

    deregisterImage : function(imageId, callback)
    {
        ec2ui_client.queryEC2("DeregisterImage", [ [ "ImageId", imageId ] ], this, true, "onCompleteDeregisterImage", callback);
    },

    onCompleteDeregisterImage : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    createSnapshot : function(volumeId, callback)
    {
        ec2ui_client.queryEC2("CreateSnapshot", [ [ "VolumeId", volumeId ] ], this, true, "onCompleteCreateSnapshot", callback);
    },

    onCompleteCreateSnapshot : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var id = getNodeValueByName(xmlDoc, "snapshotId");

        if (objResponse.callback) objResponse.callback(id);
    },

    attachVolume : function(volumeId, instanceId, device, callback)
    {
        var params = []
        if (volumeId != null) params.push([ "VolumeId", volumeId ]);
        if (instanceId != null) params.push([ "InstanceId", instanceId ]);
        if (device != null) params.push([ "Device", device ]);
        ec2ui_client.queryEC2("AttachVolume", params, this, true, "onCompleteAttachVolume", callback);
    },

    onCompleteAttachVolume : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    createVolume : function(size, snapshotId, zone, callback)
    {
        var params = []
        if (size != null) params.push([ "Size", size ]);
        if (snapshotId != null) params.push([ "SnapshotId", snapshotId ]);
        if (zone != null) params.push([ "AvailabilityZone", zone ]);
        ec2ui_client.queryEC2("CreateVolume", params, this, true, "onCompleteCreateVolume", callback);
    },

    onCompleteCreateVolume : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var id = getNodeValueByName(xmlDoc, "volumeId");
        if (objResponse.callback) objResponse.callback(id);
    },

    deleteSnapshot : function(snapshotId, callback)
    {
        ec2ui_client.queryEC2("DeleteSnapshot", [ [ "SnapshotId", snapshotId ] ], this, true, "onCompleteDeleteSnapshot", callback);
    },

    onCompleteDeleteSnapshot : function(objResponse)
    {
        ec2ui_SnapshotTreeView.refresh();
        if (objResponse.callback) objResponse.callback();
    },

    deleteVolume : function(volumeId, callback)
    {
        ec2ui_client.queryEC2("DeleteVolume", [ [ "VolumeId", volumeId ] ], this, true, "onCompleteDeleteVolume", callback);
    },

    onCompleteDeleteVolume : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    detachVolume : function(volumeId, callback)
    {
        ec2ui_client.queryEC2("DetachVolume", [ [ "VolumeId", volumeId ] ], this, true, "onCompleteDetachVolume", callback);
    },

    forceDetachVolume : function(volumeId, callback)
    {
        ec2ui_client.queryEC2("DetachVolume", [ [ "VolumeId", volumeId ], [ "Force", true ] ], this, true, "onCompleteDetachVolume", callback);
    },

    onCompleteDetachVolume : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    describeVolumes : function(callback)
    {
        ec2ui_client.queryEC2("DescribeVolumes", [], this, true, "onCompleteDescribeVolumes", callback);
    },

    onCompleteDescribeVolumes : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var tags = new Object();
        var items = xmlDoc.evaluate("/ec2:DescribeVolumesResponse/ec2:volumeSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var id = getNodeValueByName(items.snapshotItem(i), "volumeId");
            var size = getNodeValueByName(items.snapshotItem(i), "size");
            var snapshotId = getNodeValueByName(items.snapshotItem(i), "snapshotId");

            var zone = getNodeValueByName(items.snapshotItem(i), "availabilityZone");
            var status = getNodeValueByName(items.snapshotItem(i), "status");
            var createTime = new Date();
            createTime.setISO8601(getNodeValueByName(items.snapshotItem(i), "createTime"));

            // Zero out the values for attachment
            var instanceId = "";
            var device = "";
            var attachStatus = "";
            var attachTime = new Date();
            // Make sure there is an attachment
            if (items.snapshotItem(i).getElementsByTagName("attachmentSet")[0].firstChild) {
                instanceId = getNodeValueByName(items.snapshotItem(i), "instanceId");
                device = getNodeValueByName(items.snapshotItem(i), "device");
                attachStatus = items.snapshotItem(i).getElementsByTagName("status")[1].firstChild;
                if (attachStatus) {
                    attachStatus = attachStatus.nodeValue;
                }
                attachTime.setISO8601(getNodeValueByName(items.snapshotItem(i), "attachTime"));
            }
            list.push(new Volume(id, size, snapshotId, zone, status, createTime, instanceId, device, attachStatus, attachTime));

            this.walkTagSet(items.snapshotItem(i), "volumeId", tags);
        }

        this.addEC2Tag(list, "id", tags);
        ec2ui_model.updateVolumes(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    describeSnapshots : function(callback)
    {
        ec2ui_client.queryEC2("DescribeSnapshots", [], this, true, "onCompleteDescribeSnapshots", callback);
    },

    onCompleteDescribeSnapshots : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var tags = new Object();
        var items = xmlDoc.evaluate("/ec2:DescribeSnapshotsResponse/ec2:snapshotSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var id = getNodeValueByName(items.snapshotItem(i), "snapshotId");
            var volumeId = getNodeValueByName(items.snapshotItem(i), "volumeId");
            var status = getNodeValueByName(items.snapshotItem(i), "status");
            var startTime = new Date();
            startTime.setISO8601(getNodeValueByName(items.snapshotItem(i), "startTime"));
            var progress = getNodeValueByName(items.snapshotItem(i), "progress");
            var volumeSize = getNodeValueByName(items.snapshotItem(i), "volumeSize");
            var description = getNodeValueByName(items.snapshotItem(i), "description");
            var ownerId = getNodeValueByName(items.snapshotItem(i), "ownerId")
            var ownerAlias = getNodeValueByName(items.snapshotItem(i), "ownerAlias")
            list.push(new Snapshot(id, volumeId, status, startTime, progress, volumeSize, description, ownerId, ownerAlias));

            this.walkTagSet(items.snapshotItem(i), "snapshotId", tags);
        }

        this.addEC2Tag(list, "id", tags);
        ec2ui_model.updateSnapshots(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    describeVpcs : function(isSync, callback)
    {
        if (!isSync) isSync = false;
        ec2ui_client.queryEC2("DescribeVpcs", [], this, isSync, "onCompleteDescribeVpcs", callback);
    },

    onCompleteDescribeVpcs : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var list = new Array();
        var items = xmlDoc.evaluate("/ec2:DescribeVpcsResponse/ec2:vpcSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var id = getNodeValueByName(items.snapshotItem(i), "vpcId");
            var cidr = getNodeValueByName(items.snapshotItem(i), "cidrBlock");
            var state = getNodeValueByName(items.snapshotItem(i), "state");
            var dhcpopts = getNodeValueByName(items.snapshotItem(i), "dhcpOptionsId");
            list.push(new Vpc(id, cidr, state, dhcpopts));
        }

        this.addResourceTags(list, ec2ui_session.model.resourceMap.vpcs, "id");
        ec2ui_model.updateVpcs(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    createVpc : function(cidr, callback)
    {
        ec2ui_client.queryEC2("CreateVpc", [ [ "CidrBlock", cidr ] ], this, true, "onCompleteCreateVpc", callback);
    },

    onCompleteCreateVpc : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var id = getNodeValueByName(xmlDoc, "vpcId");
        if (objResponse.callback) objResponse.callback(id);
    },

    deleteVpc : function(id, callback)
    {
        ec2ui_client.queryEC2("DeleteVpc", [ [ "VpcId", id ] ], this, true, "onCompleteDeleteVpc", callback);
    },

    onCompleteDeleteVpc : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    describeSubnets : function(isSync, callback)
    {
        if (!isSync) isSync = false;
        ec2ui_client.queryEC2("DescribeSubnets", [], this, isSync, "onCompleteDescribeSubnets", callback);
    },

    onCompleteDescribeSubnets : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var list = new Array();
        var items = xmlDoc.evaluate("/ec2:DescribeSubnetsResponse/ec2:subnetSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var id = getNodeValueByName(items.snapshotItem(i), "subnetId");
            var vpcId = getNodeValueByName(items.snapshotItem(i), "vpcId");
            var cidrBlock = getNodeValueByName(items.snapshotItem(i), "cidrBlock");
            var state = getNodeValueByName(items.snapshotItem(i), "state");
            var availableIp = getNodeValueByName(items.snapshotItem(i), "availableIpAddressCount");
            var availabilityZone = getNodeValueByName(items.snapshotItem(i), "availabilityZone");
            list.push(new Subnet(id, vpcId, cidrBlock, state, availableIp, availabilityZone));
        }

        this.addResourceTags(list, ec2ui_session.model.resourceMap.subnets, "id");
        ec2ui_model.updateSubnets(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    createSubnet : function(vpcId, cidr, az, callback)
    {
        ec2ui_client.queryEC2("CreateSubnet", [ [ "CidrBlock", cidr ], [ "VpcId", vpcId ], [ "AvailabilityZone", az ] ], this, true, "onCompleteCreateSubnet", callback);
    },

    onCompleteCreateSubnet : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    deleteSubnet : function(id, callback)
    {
        ec2ui_client.queryEC2("DeleteSubnet", [ [ "SubnetId", id ] ], this, true, "onCompleteDeleteSubnet", callback);
    },

    onCompleteDeleteSubnet : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    describeDhcpOptions : function(isSync, callback)
    {
        if (!isSync) isSync = false;
        ec2ui_client.queryEC2("DescribeDhcpOptions", [], this, isSync, "onCompleteDescribeDhcpOptions", callback);
    },

    onCompleteDescribeDhcpOptions : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var list = new Array();
        var items = xmlDoc.evaluate("/ec2:DescribeDhcpOptionsResponse/ec2:dhcpOptionsSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var id = getNodeValueByName(items.snapshotItem(i), "dhcpOptionsId");
            var options = new Array();

            var optTags = items.snapshotItem(i).getElementsByTagName("dhcpConfigurationSet")[0];
            var optItems = optTags.childNodes;
            log("Parsing DHCP Options: " + optItems.length + " option sets");

            for ( var j = 0; j < optItems.length; j++) {
                if (optItems.item(j).nodeName == '#text') continue;
                var key = getNodeValueByName(optItems.item(j), "key");
                var values = new Array();

                var valtags = optItems.item(j).getElementsByTagName("valueSet")[0];
                var valItems = valtags.childNodes;
                log("Parsing DHCP Option " + key + ": " + valItems.length + " values");

                for ( var k = 0; k < valItems.length; k++) {
                    if (valItems.item(k).nodeName == '#text') continue;
                    values.push(getNodeValueByName(valItems.item(k), "value"));
                }
                options.push(key + " = " + values.join(","))
            }
            list.push(new DhcpOptions(id, options.join("; ")));
        }

        this.addResourceTags(list, ec2ui_session.model.resourceMap.dhcpOptions, "id");
        ec2ui_model.updateDhcpOptions(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    associateDhcpOptions : function(dhcpOptionsId, vpcId, callback)
    {
        ec2ui_client.queryEC2("AssociateDhcpOptions", [ [ "DhcpOptionsId", dhcpOptionsId ], [ "VpcId", vpcId ] ], this, true, "onCompleteAssociateDhcpOptions", callback);
    },

    onCompleteAssociateDhcpOptions : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    createDhcpOptions : function(opts, callback)
    {
        var params = new Array();

        for ( var i = 0; i < opts.length; i++) {
            if (opts[i][1] == null || opts[i][1].length == 0) continue;

            params.push([ "DhcpConfiguration." + (i + 1) + ".Key", opts[i][0] ]);
            for ( var j = 0; j < opts[i][1].length; j++) {
                params.push([ "DhcpConfiguration." + (i + 1) + ".Value." + (j + 1), opts[i][1][j] ]);
            }
        }

        ec2ui_client.queryEC2("CreateDhcpOptions", params, this, true, "onCompleteCreateDhcpOptions", callback);
    },

    onCompleteCreateDhcpOptions : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    deleteDhcpOptions : function(id, callback)
    {
        ec2ui_client.queryEC2("DeleteDhcpOptions", [ [ "DhcpOptionsId", id ] ], this, true, "onCompleteDeleteDhcpOptions", callback);
    },

    onCompleteDeleteDhcpOptions : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    createNetworkAclEntry : function(aclId, num, proto, action, egress, cidr, var1, var2, callback)
    {
        var params = [ [ "NetworkAclId", aclId ], [ "RuleNumber", num], ["Protocol", proto], ["RuleAction", action], ["Egress", egress], ["CidrBlock", cidr] ];
        switch (proto) {
        case "1":
            params.push([ "Icmp.Code", var1])
            params.push([ "Icmp.Type", var2])
            break;
        case "6":
        case "17":
            params.push(["PortRange.From", var1])
            params.push(["PortRange.To", var2])
            break;
        }
        ec2ui_client.queryEC2("CreateNetworkAclEntry", params, this, true, "onCompleteCreateNetworkAclEntry", callback);
    },

    onCompleteCreateNetworkAclEntry : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    deleteNetworkAclEntry : function(aclId, num, egress, callback)
    {
        ec2ui_client.queryEC2("DeleteNetworkAclEntry", [ [ "NetworkAclId", aclId ], ["RuleNumber", num], ["Egress", egress] ], this, true, "onCompleteDeleteNetworkAclEntry", callback);
    },

    onCompleteDeleteNetworkAclEntry : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    ReplaceNetworkAclAssociation: function(assocId, aclId, callback)
    {
        ec2ui_client.queryEC2("ReplaceNetworkAclAssociation", [ [ "AssociationId", assocId ], ["NetworkAclId", aclId] ], this, true, "onCompleteReplaceNetworkAclAssociation", callback);
    },

    onCompleteReplaceNetworkAclAssociation : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    createNetworkAcl : function(vpcId, callback)
    {
        ec2ui_client.queryEC2("CreateNetworkAcl", [ [ "VpcId", vpcId ] ], this, true, "onCompleteCreateNetworkAcl", callback);
    },

    onCompleteCreateNetworkAcl : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    deleteNetworkAcl : function(id, callback)
    {
        ec2ui_client.queryEC2("DeleteNetworkAcl", [ [ "NetworkAclId", id ] ], this, true, "onCompleteDeleteNetworkAcl", callback);
    },

    onCompleteDeleteNetworkAcl : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    describeNetworkAcls : function(callback)
    {
        ec2ui_client.queryEC2("DescribeNetworkAcls", [], this, true, "onCompleteDescribeNetworkAcls", callback);
    },

    onCompleteDescribeNetworkAcls : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.evaluate("/ec2:DescribeNetworkAclsResponse/ec2:networkAclSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var entryList = [], assocList = []
            var id = getNodeValueByName(items.snapshotItem(i), "networkAclId");
            var vpcId = getNodeValueByName(items.snapshotItem(i), "vpcId");
            var dflt = getNodeValueByName(items.snapshotItem(i), "default");

            var entries = items.snapshotItem(i).getElementsByTagName("entrySet")[0].getElementsByTagName("item");
            for ( var j = 0; j < entries.length; j++) {
                var num = getNodeValueByName(entries[j], "ruleNumber");
                var proto = getNodeValueByName(entries[j], "protocol");
                var action = getNodeValueByName(entries[j], "ruleAction");
                var egress = getNodeValueByName(entries[j], "egress");
                var cidr = getNodeValueByName(entries[j], "cidrBlock");

                var icmpList = [], portList = []
                var code = getNodeValueByName(entries[j], "code");
                var type = getNodeValueByName(entries[j], "type");
                if (code != "" && type != "") {
                    icmpList.push([code, type])
                }
                var from = getNodeValueByName(entries[j], "from");
                var to = getNodeValueByName(entries[j], "to");
                if (from != "" && to != "") {
                    portList.push([from, to])
                }

                entryList.push(new NetworkAclEntry(num, proto, action, egress, cidr, icmpList, portList))
            }

            var assoc = items.snapshotItem(i).getElementsByTagName("associationSet")[0].getElementsByTagName("item");
            for ( var j = 0; j < assoc.length; j++) {
                var aid = getNodeValueByName(assoc[j], "networkAclAssociationId");
                var acl = getNodeValueByName(assoc[j], "networkAclId");
                var subnet = getNodeValueByName(assoc[j], "subnetId");
                assocList.push(new NetworkAclAssociation(aid, acl, subnet))
            }
            list.push(new NetworkAcl(id, vpcId, dflt, entryList, assocList));
        }

        ec2ui_model.updateNetworkAcls(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    describeVpnGateways : function(isSync, callback)
    {
        if (!isSync) isSync = false;
        ec2ui_client.queryEC2("DescribeVpnGateways", [], this, isSync, "onCompleteDescribeVpnGateways", callback);
    },

    onCompleteDescribeVpnGateways : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var list = new Array();
        var items = xmlDoc.evaluate("/ec2:DescribeVpnGatewaysResponse/ec2:vpnGatewaySet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var id = getNodeValueByName(items.snapshotItem(i), "vpnGatewayId");
            var availabilityZone = getNodeValueByName(items.snapshotItem(i), "availabilityZone");
            var type = getNodeValueByName(items.snapshotItem(i), "type");
            var state = getNodeValueByName(items.snapshotItem(i), "state");
            var attachments = new Array();

            var atttags = items.snapshotItem(i).getElementsByTagName("attachments")[0].getElementsByTagName("item");
            for ( var j = 0; j < atttags.length; j++) {
                var vpcId = getNodeValueByName(atttags[j], "vpcId");
                var attstate = getNodeValueByName(atttags[j], "state");
                var att = new VpnGatewayAttachment(vpcId, id, attstate)
                attachments.push(att)
            }
            list.push(new VpnGateway(id, availabilityZone, state, type, attachments));
        }

        this.addResourceTags(list, ec2ui_session.model.resourceMap.vpnGateways, "id");
        ec2ui_model.updateVpnGateways(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    createVpnGateway : function(type, az, callback)
    {
        ec2ui_client.queryEC2("CreateVpnGateway", [ [ "Type", type ], [ "AvailabilityZone", az ] ], this, true, "onCompleteCreateVpnGateway", callback);
    },

    onCompleteCreateVpnGateway : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    deleteVpnGateway : function(id, callback)
    {
        ec2ui_client.queryEC2("DeleteVpnGateway", [ [ "VpnGatewayId", id ] ], this, true, "onCompleteDeleteVpnGateway", callback);
    },

    onCompleteDeleteVpnGateway : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    describeCustomerGateways : function(isSync, callback)
    {
        if (!isSync) isSync = false;
        ec2ui_client.queryEC2("DescribeCustomerGateways", [], this, isSync, "onCompleteDescribeCustomerGateways", callback);
    },

    onCompleteDescribeCustomerGateways : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var list = new Array();
        var items = xmlDoc.evaluate("/ec2:DescribeCustomerGatewaysResponse/ec2:customerGatewaySet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var id = getNodeValueByName(items.snapshotItem(i), "customerGatewayId");
            var type = getNodeValueByName(items.snapshotItem(i), "type");
            var state = getNodeValueByName(items.snapshotItem(i), "state");
            var ipAddress = getNodeValueByName(items.snapshotItem(i), "ipAddress");
            var bgpAsn = getNodeValueByName(items.snapshotItem(i), "bgpAsn");
            list.push(new CustomerGateway(id, ipAddress, bgpAsn, state, type));
        }

        this.addResourceTags(list, ec2ui_session.model.resourceMap.customerGateways, "id");
        ec2ui_model.updateCustomerGateways(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    createCustomerGateway : function(type, ip, asn, callback)
    {
        ec2ui_client.queryEC2("CreateCustomerGateway", [ [ "Type", type ], [ "IpAddress", ip ], [ "BgpAsn", asn ] ], this, true, "onCompleteCreateCustomerGateway", callback);
    },

    onCompleteCreateCustomerGateway : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    deleteCustomerGateway : function(id, callback)
    {
        ec2ui_client.queryEC2("DeleteCustomerGateway", [ [ "CustomerGatewayId", id ] ], this, true, "onCompleteDeleteCustomerGateway", callback);
    },

    onCompleteDeleteCustomerGateway : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    describeInternetGateways : function(isSync, callback)
    {
        if (!isSync) isSync = false;
        ec2ui_client.queryEC2("DescribeInternetGateways", [], this, isSync, "onCompleteDescribeInternetGateways", callback);
    },

    onCompleteDescribeInternetGateways : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var list = new Array();
        var items = xmlDoc.evaluate("/ec2:DescribeInternetGatewaysResponse/ec2:internetGatewaySet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var vpcs = [], tags = []
            var id = getNodeValueByName(items.snapshotItem(i), "internetGatewayId");

            var etags = items.snapshotItem(i).getElementsByTagName("attachmentSet")[0].getElementsByTagName("item");
            for ( var j = 0; j < etags.length; j++) {
                var vpcId = getNodeValueByName(etags[j], "vpcId");
                vpcs.push(vpcId)
            }
            etags = items.snapshotItem(i).getElementsByTagName("tagSet")[0].getElementsByTagName("item");
            for ( var j = 0; j < etags.length; j++) {
                var key = getNodeValueByName(etags[j], "key");
                var val = getNodeValueByName(etags[j], "value");
                tags.push(new Tag(key, value))
            }
            list.push(new InternetGateway(id, vpcs, tags));
        }

        this.addResourceTags(list, ec2ui_session.model.resourceMap.internetGateways, "id");
        ec2ui_model.updateInternetGateways(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    createInternetGateway : function(callback)
    {
        ec2ui_client.queryEC2("CreateInternetGateway", [], this, true, "onCompleteCreateInternetGateway", callback);
    },

    onCompleteCreateInternetGateway : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var id = getNodeValueByName(xmlDoc, "internetGatewayId");
        if (objResponse.callback) objResponse.callback(id);
    },

    deleteInternetGateway : function(id, callback)
    {
        ec2ui_client.queryEC2("DeleteInternetGateway", [ [ "InternetGatewayId", id ] ], this, true, "onCompleteDeleteInternetGateway", callback);
    },

    onCompleteDeleteInternetGateway : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    attachInternetGateway : function(igwid, vpcid, callback)
    {
        ec2ui_client.queryEC2("AttachInternetGateway", [["InternetGatewayId", igwid], ["VpcId", vpcid]], this, true, "onCompleteAttachInternetGateway", callback);
    },

    onCompleteAttachInternetGateway : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    detachInternetGateway : function(igwid, vpcid, callback)
    {
        ec2ui_client.queryEC2("DetachInternetGateway", [["InternetGatewayId", igwid], ["VpcId", vpcid]], this, true, "onCompleteDetachInternetGateway", callback);
    },

    onCompleteDetachInternetGateway : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    describeVpnConnections : function(isSync, callback)
    {
        if (!isSync) isSync = false;
        ec2ui_client.queryEC2("DescribeVpnConnections", [], this, isSync, "onCompleteDescribeVpnConnections", callback);
    },

    onCompleteDescribeVpnConnections : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        // required due to the size of the customer gateway config
        // being very close to or in excess of 4096 bytes
        xmlDoc.normalize();

        var list = new Array();
        var items = xmlDoc.evaluate("/ec2:DescribeVpnConnectionsResponse/ec2:vpnConnectionSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var id = getNodeValueByName(items.snapshotItem(i), "vpnConnectionId");
            var cgwId = getNodeValueByName(items.snapshotItem(i), "customerGatewayId");
            var vgwId = getNodeValueByName(items.snapshotItem(i), "vpnGatewayId");
            var type = getNodeValueByName(items.snapshotItem(i), "type");
            var state = getNodeValueByName(items.snapshotItem(i), "state");
            var ipAddress = getNodeValueByName(items.snapshotItem(i), "ipAddress");
            // Required since Firefox limits nodeValue to 4096 bytes
            var cgwtag = items.snapshotItem(i).getElementsByTagName("customerGatewayConfiguration")
            var config = null;
            if (cgwtag[0]) {
                config = cgwtag[0].textContent;
            }

            var bgpAsn = getNodeValueByName(items.snapshotItem(i), "bgpAsn");

            list.push(new VpnConnection(id, vgwId, cgwId, type, state, config));
        }

        this.addResourceTags(list, ec2ui_session.model.resourceMap.vpnConnections, "id");
        ec2ui_model.updateVpnConnections(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    createVpnConnection : function(type, cgwid, vgwid, callback)
    {
        ec2ui_client.queryEC2("CreateVpnConnection", [ [ "Type", type ], [ "CustomerGatewayId", cgwid ], [ "VpnGatewayId", vgwid ] ], this, true, "onCompleteCreateVpnConnection", callback);
    },

    onCompleteCreateVpnConnection : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    deleteVpnConnection : function(id, callback)
    {
        ec2ui_client.queryEC2("DeleteVpnConnection", [ [ "VpnConnectionId", id ] ], this, true, "onCompleteDeleteVpnConnection", callback);
    },

    onCompleteDeleteVpnConnection : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    attachVpnGatewayToVpc : function(vgwid, vpcid, callback)
    {
        ec2ui_client.queryEC2("AttachVpnGateway", [ [ "VpnGatewayId", vgwid ], [ "VpcId", vpcid ] ], this, true, "onCompleteAttachVpnGatewayToVpc", callback);
    },

    onCompleteAttachVpnGatewayToVpc : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    detachVpnGatewayFromVpc : function(vgwid, vpcid, callback)
    {
        ec2ui_client.queryEC2("DetachVpnGateway", [ [ "VpnGatewayId", vgwid ], [ "VpcId", vpcid ] ], this, true, "onCompleteDetachVpnGatewayFromVpc", callback);
    },

    onCompleteDetachVpnGatewayFromVpc : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    describeImage : function(imageId, callback)
    {
        ec2ui_client.queryEC2("DescribeImages", [ [ "ImageId", imageId ] ], this, true, "onCompleteDescribeImage", callback);
    },

    onCompleteDescribeImage : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var items = xmlDoc.evaluate("/ec2:DescribeImagesResponse/ec2:imagesSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        var item = items.snapshotItem(0);
        var ami = null;

        if (item) {
            var imageId = getNodeValueByName(item, "imageId");
            var imageLocation = getNodeValueByName(item, "imageLocation");
            var imageState = getNodeValueByName(item, "imageState");
            var owner = getNodeValueByName(item, "imageOwnerId");
            var isPublic = getNodeValueByName(item, "isPublic");

            // This value might not exist, but getNodeValueByName
            // returns "" in case the element is not defined.
            var platform = getNodeValueByName(item, "platform");
            var aki = getNodeValueByName(item, "kernelId");
            var ari = getNodeValueByName(item, "ramdiskId");

            var rdt = getNodeValueByName(item, "rootDeviceType");
            var ownerAlias = getNodeValueByName(item, "imageOwnerAlias");
            var name = getNodeValueByName(item, "name");
            var description = getNodeValueByName(item, "description");
            var snapshotId = getNodeValueByName(item, "snapshotId");

            ami = new AMI(imageId, imageLocation, imageState, owner, (isPublic == 'true' ? 'public' : 'private'), platform, aki, ari, rdt, ownerAlias, name, description, snapshotId);
        }

        ec2ui_model.addToAmiManifestMap(ami);
        if (objResponse.callback && ami) objResponse.callback(ami);
    },

    createImage : function(instanceId, amiName, amiDescription, noReboot, callback)
    {
        var noRebootVal = "false";
        if (noReboot == true) noRebootVal = "true";

        ec2ui_client.queryEC2("CreateImage", [ [ "InstanceId", instanceId ], [ "Name", amiName ], [ "Description", amiDescription ], [ "NoReboot", noRebootVal ] ], this, true, "onCompleteCreateImage", callback);
    },

    onCompleteCreateImage : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var id = getNodeValueByName(xmlDoc, "imageId");

        if (objResponse.callback) objResponse.callback(id);
    },

    describeImages : function(isSync, callback)
    {
        if (!isSync) isSync = false;
        ec2ui_client.queryEC2("DescribeImages", [], this, isSync, "onCompleteDescribeImages", callback);
    },

    onCompleteDescribeImages : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var tags = new Object();
        var img = null;
        var items = xmlDoc.evaluate("/ec2:DescribeImagesResponse/ec2:imagesSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var imageId = getNodeValueByName(items.snapshotItem(i), "imageId");
            var imageLocation = getNodeValueByName(items.snapshotItem(i), "imageLocation");
            var imageState = getNodeValueByName(items.snapshotItem(i), "imageState");
            var owner = getNodeValueByName(items.snapshotItem(i), "imageOwnerId");
            var isPublic = getNodeValueByName(items.snapshotItem(i), "isPublic");
            var arch = getNodeValueByName(items.snapshotItem(i), "architecture");
            var rdt = getNodeValueByName(items.snapshotItem(i), "rootDeviceType");
            var ownerAlias = getNodeValueByName(items.snapshotItem(i), "imageOwnerAlias");
            var name = getNodeValueByName(items.snapshotItem(i), "name");
            var description = getNodeValueByName(items.snapshotItem(i), "description");
            var snapshotId = getNodeValueByName(items.snapshotItem(i), "snapshotId");

            // These value might not exist, but getNodeValueByName
            // returns "" in case the element is not defined.
            var platform = getNodeValueByName(items.snapshotItem(i), "platform");
            var aki = getNodeValueByName(items.snapshotItem(i), "kernelId");
            var ari = getNodeValueByName(items.snapshotItem(i), "ramdiskId");

            list.push(new AMI(imageId, imageLocation, imageState, owner, (isPublic == 'true' ? 'public' : 'private'), arch, platform, aki, ari, rdt, ownerAlias, name, description, snapshotId));
            this.walkTagSet(items.snapshotItem(i), "imageId", tags);
        }

        this.addEC2Tag(list, "id", tags);
        ec2ui_model.updateImages(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    describeLeaseOfferings : function(callback)
    {
        ec2ui_client.queryEC2("DescribeReservedInstancesOfferings", [], this, true, "onCompleteDescribeLeaseOfferings", callback);
    },

    onCompleteDescribeLeaseOfferings : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var img = null;
        var items = xmlDoc.evaluate("/ec2:DescribeReservedInstancesOfferingsResponse/ec2:reservedInstancesOfferingsSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var id = getNodeValueByName(items.snapshotItem(i), "reservedInstancesOfferingId");
            var type = getNodeValueByName(items.snapshotItem(i), "instanceType");
            var az = getNodeValueByName(items.snapshotItem(i), "availabilityZone");
            var duration = secondsToYears(getNodeValueByName(items.snapshotItem(i), "duration"));
            var fPrice = parseInt(getNodeValueByName(items.snapshotItem(i), "fixedPrice")).toString();
            var uPrice = getNodeValueByName(items.snapshotItem(i), "usagePrice");
            var desc = getNodeValueByName(items.snapshotItem(i), "productDescription");
            var otype = getNodeValueByName(items.snapshotItem(i), "offeringType");
            var tenancy = getNodeValueByName(items.snapshotItem(i), "instanceTenancy");

            list.push(new LeaseOffering(id, type, az, duration, fPrice, uPrice, desc, otype, tenancy));
        }

        ec2ui_model.updateLeaseOfferings(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    describeReservedInstances : function(callback)
    {
        ec2ui_client.queryEC2("DescribeReservedInstances", [], this, true, "onCompleteDescribeReservedInstances", callback);
    },

    onCompleteDescribeReservedInstances : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var img = null;
        var items = xmlDoc.evaluate("/ec2:DescribeReservedInstancesResponse/ec2:reservedInstancesSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var item = items.snapshotItem(i);
            var id = getNodeValueByName(item, "reservedInstancesId");
            var type = getNodeValueByName(item, "instanceType");
            var az = getNodeValueByName(item, "availabilityZone");
            var start = new Date();
            start.setISO8601(getNodeValueByName(item, "start"));
            var duration = secondsToYears(getNodeValueByName(item, "duration"));
            var fPrice = parseInt(getNodeValueByName(item, "fixedPrice")).toString();
            var uPrice = getNodeValueByName(item, "usagePrice");
            var count = getNodeValueByName(item, "instanceCount");
            var desc = getNodeValueByName(item, "productDescription");
            var state = getNodeValueByName(item, "state");
            var tenancy = getNodeValueByName(item, "instanceTenancy");

            list.push(new ReservedInstance(id, type, az, start, duration, fPrice, uPrice, count, desc, state, tenancy));
        }

        ec2ui_model.updateReservedInstances(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    purchaseOffering : function(id, count, callback)
    {
        ec2ui_client.queryEC2("PurchaseReservedInstancesOffering", [ [ "ReservedInstancesOfferingId", id ], [ "InstanceCount", count ] ], this, true, "onCompletePurchaseOffering", callback);
    },

    onCompletePurchaseOffering : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var id = getNodeValueByName(xmlDoc, "reservedInstancesId");

        if (objResponse.callback) objResponse.callback(id);
    },

    describeLaunchPermissions : function(imageId, callback)
    {
        ec2ui_client.queryEC2("DescribeImageAttribute", [ [ "ImageId", imageId ], [ "Attribute", "launchPermission" ] ], this, true, "onCompleteDescribeLaunchPermissions", callback);
    },

    onCompleteDescribeLaunchPermissions : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.getElementsByTagName("item");
        for ( var i = 0; i < items.length; i++) {
            if (items[i].getElementsByTagName("group")[0]) {
                list.push(getNodeValueByName(items[i], "group"));
            }
            if (items[i].getElementsByTagName("userId")[0]) {
                list.push(getNodeValueByName(items[i], "userId"));
            }
        }

        if (objResponse.callback) objResponse.callback(list);
    },

    addLaunchPermission : function(imageId, name, callback)
    {
        var params = []
        params.push([ "ImageId", imageId ]);
        params.push([ "Attribute", "launchPermission" ]);
        params.push([ "OperationType", "add" ]);
        if (name == "all") {
            params.push([ "UserGroup.1", name ]);
        } else {
            params.push([ "UserId.1", name ]);
        }
        ec2ui_client.queryEC2("ModifyImageAttribute", params, this, true, "onCompleteModifyImageAttribute", callback);
    },

    revokeLaunchPermission : function(imageId, name, callback)
    {
        var params = []
        params.push([ "ImageId", imageId ]);
        params.push([ "Attribute", "launchPermission" ]);
        params.push([ "OperationType", "remove" ]);
        if (name == "all") {
            params.push([ "UserGroup.1", name ]);
        } else {
            params.push([ "UserId.1", name ]);
        }
        ec2ui_client.queryEC2("ModifyImageAttribute", params, this, true, "onCompleteModifyImageAttribute", callback);
    },

    onCompleteModifyImageAttribute : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    resetLaunchPermissions : function(imageId, callback)
    {
        var params = []
        params.push([ "ImageId", imageId ]);
        params.push([ "Attribute", "launchPermission" ]);
        ec2ui_client.queryEC2("ResetImageAttribute", params, this, true, "onCompleteResetImageAttribute", callback);
    },

    onCompleteResetImageAttribute : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    firstChild : function(node)
    {
        return node == null ? "" : node.firstChild.nodeValue
    },

    unpackReservationInstances : function(resId, ownerId, groups, instanceItems)
    {
        var list = new Array();

        for ( var j = 0; j < instanceItems.length; j++) {
            if (instanceItems[j].nodeName == '#text') continue;

            var instanceId = getNodeValueByName(instanceItems[j], "instanceId");
            var imageId = getNodeValueByName(instanceItems[j], "imageId");

            var instanceState = instanceItems[j].getElementsByTagName("instanceState")[0];
            var stateName = getNodeValueByName(instanceState, "name");

            var dnsName = getNodeValueByName(instanceItems[j], "dnsName");
            var privateDnsName = getNodeValueByName(instanceItems[j], "privateDnsName");
            var privateIpAddress = getNodeValueByName(instanceItems[j], "privateIpAddress");
            var vpcId = getNodeValueByName(instanceItems[j], "vpcId");
            var subnetId = getNodeValueByName(instanceItems[j], "subnetId");
            var keyName = getNodeValueByName(instanceItems[j], "keyName");
            var reason = getNodeValueByName(instanceItems[j], "reason");
            var amiLaunchIdx = getNodeValueByName(instanceItems[j], "amiLaunchIndex");
            var instanceType = getNodeValueByName(instanceItems[j], "instanceType");
            var launchTime = new Date();
            launchTime.setISO8601(getNodeValueByName(instanceItems[j], "launchTime"));

            var placementElem = instanceItems[j].getElementsByTagName("placement")[0];
            var availabilityZone = getNodeValueByName(placementElem, "availabilityZone");
            var tenancy = getNodeValueByName(placementElem, "tenancy");
            var placement = {  "availabilityZone" : availabilityZone, "tenancy": tenancy };

            // This value might not exist, but getNodeValueByName
            // returns "" in case the element is not defined.
            var platform = getNodeValueByName(instanceItems[j], "platform");
            if (!isWindows(platform)) {
                var kernelId = getNodeValueByName(instanceItems[j], "kernelId");
                var ramdiskId = getNodeValueByName(instanceItems[j], "ramdiskId");
            }
            var rdt = getNodeValueByName(instanceItems[j], "rootDeviceType");

            list.push(new Instance(resId, ownerId, groups, instanceId, imageId, kernelId || "", ramdiskId || "", stateName, dnsName, privateDnsName, privateIpAddress, keyName, reason, amiLaunchIdx, instanceType, launchTime, placement, platform, null, vpcId, subnetId, rdt));
        }

        return list;
    },

    runInstances : function(imageId, kernelId, ramdiskId, minCount, maxCount, keyName, securityGroups, userData, properties, instanceType, placement, subnetId, ipAddress, callback)
    {
        var params = []
        params.push([ "ImageId", imageId ]);
        if (kernelId != null && kernelId != "") {
            params.push([ "KernelId", kernelId ]);
        }
        if (ramdiskId != null && ramdiskId != "") {
            params.push([ "RamdiskId", ramdiskId ]);
        }
        params.push([ "InstanceType", instanceType ]);
        params.push([ "MinCount", minCount ]);
        params.push([ "MaxCount", maxCount ]);
        if (keyName != null && keyName != "") {
            params.push([ "KeyName", keyName ]);
        }
        for (var i in securityGroups) {
            params.push([ "SecurityGroupId." + (i + 1), typeof securityGroups[i] == "object" ? securityGroups[i].id : securityGroups[i] ]);
        }
        if (userData != null) {
            var b64str = "Base64:";
            if (userData.indexOf(b64str) != 0) {
                // This data needs to be encoded
                userData = Base64.encode(userData);
            } else {
                userData = userData.substring(b64str.length);
            }
            log(userData);
            params.push([ "UserData", userData ]);
        }
        if (properties != null) {
            params.push([ "AdditionalInfo", properties ]);
        }
        if (placement.availabilityZone != null && placement.availabilityZone != "") {
            params.push([ "Placement.AvailabilityZone", placement.availabilityZone ]);
        }
        if (placement.tenancy != null && placement.tenancy != "") {
            params.push([ "Placement.Tenancy", placement.tenancy ]);
        }
        if (subnetId != null) {
            params.push([ "SubnetId", subnetId ]);

            if (ipAddress != null && ipAddress != "") {
                params.push([ "PrivateIpAddress", ipAddress ]);
            }
        }

        ec2ui_client.queryEC2("RunInstances", params, this, true, "onCompleteRunInstances", callback);
    },

    onCompleteRunInstances : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.evaluate("/", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var resId = getNodeValueByName(items.snapshotItem(i), "reservationId");
            var ownerId = getNodeValueByName(items.snapshotItem(i), "ownerId");
            var groups = new Array();
            var groupIds = items.snapshotItem(i).getElementsByTagName("groupId");
            for ( var j = 0; j < groupIds.length; j++) {
                groups.push(groupIds[j].firstChild.nodeValue);
            }

            var instancesSet = items.snapshotItem(i).getElementsByTagName("instancesSet")[0];
            var instanceItems = instancesSet.childNodes;

            if (instanceItems) {
                var resList = this.unpackReservationInstances(resId, ownerId, groups, instanceItems);
                for ( var j = 0; j < resList.length; j++) {
                    list.push(resList[j]);
                }
            }
        }

        if (objResponse.callback) objResponse.callback(list);
    },

    terminateInstances : function(instanceIds, callback)
    {
        var params = []
        for ( var i in instanceIds) {
            params.push([ "InstanceId." + (i + 1), instanceIds[i] ]);
        }
        ec2ui_client.queryEC2("TerminateInstances", params, this, true, "onCompleteTerminateInstances", callback);
    },

    onCompleteTerminateInstances : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.evaluate("/", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var instancesSet = items.snapshotItem(i).getElementsByTagName("instancesSet")[0];
            var instanceItems = instancesSet.getElementsByTagName("item");
            for ( var j = 0; j < instanceItems.length; j++) {
                var instanceId = getNodeValueByName(instanceItems[j], "instanceId");
                list.push({
                    id : instanceId
                });
            }
        }

        if (objResponse.callback) objResponse.callback(list);
    },

    stopInstances : function(instanceIds, force, callback)
    {
        var params = []
        for ( var i in instanceIds) {
            params.push([ "InstanceId." + (i + 1), instanceIds[i] ]);
        }
        if (force == true) {
            params.push([ "Force", "true" ]);
        }
        ec2ui_client.queryEC2("StopInstances", params, this, true, "onCompleteStopInstances", callback);
    },

    onCompleteStopInstances : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.evaluate("/", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var instancesSet = items.snapshotItem(i).getElementsByTagName("instancesSet")[0];
            var instanceItems = instancesSet.getElementsByTagName("item");
            for ( var j = 0; j < instanceItems.length; j++) {
                var instanceId = getNodeValueByName(instanceItems[j], "instanceId");
                list.push({
                    id : instanceId
                });
            }
        }

        if (objResponse.callback) objResponse.callback(list);
    },

    startInstances : function(instanceIds, callback)
    {
        var params = []
        for ( var i in instanceIds) {
            params.push([ "InstanceId." + (i + 1), instanceIds[i] ]);
        }
        ec2ui_client.queryEC2("StartInstances", params, this, true, "onCompleteStartInstances", callback);
    },

    onCompleteStartInstances : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        log("onCompleteStartInstances invoked");
        var list = new Array();
        var items = xmlDoc.evaluate("/", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var instancesSet = items.snapshotItem(i).getElementsByTagName("instancesSet")[0];
            var instanceItems = instancesSet.getElementsByTagName("item");
            for ( var j = 0; j < instanceItems.length; j++) {
                var instanceId = getNodeValueByName(instanceItems[j], "instanceId");
                list.push({
                    id : instanceId
                });
            }
        }

        if (objResponse.callback) objResponse.callback(list);
    },

    describeInstances : function(callback)
    {
        ec2ui_client.queryEC2("DescribeInstances", [], this, true, "onCompleteDescribeInstances", callback);
    },

    onCompleteDescribeInstances : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var tags = new Object();
        var items = xmlDoc.evaluate("/ec2:DescribeInstancesResponse/ec2:reservationSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var resId = getNodeValueByName(items.snapshotItem(i), "reservationId");
            var ownerId = getNodeValueByName(items.snapshotItem(i), "ownerId");
            var groups = new Array();
            var groupIds = items.snapshotItem(i).getElementsByTagName("groupId");
            for ( var j = 0; j < groupIds.length; j++) {
                groups.push(groupIds[j].firstChild.nodeValue);
            }
            var instancesSet = items.snapshotItem(i).getElementsByTagName("instancesSet")[0];
            var instanceItems = instancesSet.childNodes;

            if (instanceItems) {
                var resList = this.unpackReservationInstances(resId, ownerId, groups, instanceItems);
                list = list.concat(resList);

                for ( var j = 0; j < instanceItems.length; j++) {
                    var instanceItem = instanceItems[j];

                    if (instanceItem.nodeName == '#text') {
                        continue;
                    }

                    this.walkTagSet(instanceItem, "instanceId", tags);
                }
            }
        }

        this.addEC2Tag(list, "id", tags);
        ec2ui_model.updateInstances(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    walkTagSet : function(item, idName, tags)
    {
        var instanceId = getNodeValueByName(item, idName);
        var tagSet = item.getElementsByTagName("tagSet")[0];

        if (tagSet) {
            var tagSetItems = tagSet.getElementsByTagName("item");
            var tagArray = new Array();
            var nameTag = null;

            for ( var i = 0; i < tagSetItems.length; i++) {
                var tagSetItem = tagSetItems[i];
                var tagSetItemKey = getNodeValueByName(tagSetItem, "key");
                var tagSetItemValue = getNodeValueByName(tagSetItem, "value");

                if (/[,"]/.test(tagSetItemValue)) {
                    tagSetItemValue = tagSetItemValue.replace(/"/g, '""');
                    tagSetItemValue = '"' + tagSetItemValue + '"';
                }

                var keyValue = tagSetItemKey + ":" + tagSetItemValue;

                if (tagSetItemKey == "Name") {
                    nameTag = keyValue;
                } else {
                    tagArray.push(keyValue);
                }
            }

            tagArray.sort();

            if (nameTag) {
                tagArray.unshift(nameTag);
            }

            tags[instanceId] = tagArray.join(", ");
        }
    },

    addResourceTags : function(list, resourceType, attribute)
    {
        if (!list || list.length == 0) {
            return;
        }

        var tags = ec2ui_session.getResourceTags(resourceType);

        if (!tags) {
            return;
        }

        var new_tags = ec2ui_prefs.getEmptyWrappedMap();
        var res = null;
        var tag = null;
        for ( var i in list) {
            res = list[i];
            tag = tags.get(res[attribute]);
            if (tag && tag.length) {
                res.tag = unescape(tag);
                new_tags.put(res[attribute], escape(res.tag));
            }
        }
        // Now that we've built the new set of instance tags, persist them
        ec2ui_session.setResourceTags(resourceType, new_tags);
    },

    addEC2Tag : function(list, attribute, tags)
    {
        if (!list || list.length == 0) {
            return;
        }

        if (!tags) {
            return;
        }

        var res = null;
        var tag = null;
        for ( var i in list) {
            res = list[i];
            tag = tags[res[attribute]];
            if (tag && tag.length) {
                res.tag = tag
                __addNameTagToModel__(tag, res);
            }
        }
    },

    retrieveBundleTaskFromResponse : function(item)
    {
        var instanceId = getNodeValueByName(item, "instanceId");
        var id = getNodeValueByName(item, "bundleId");
        var state = getNodeValueByName(item, "state");

        var startTime = new Date();
        startTime.setISO8601(getNodeValueByName(item, "startTime"));

        var updateTime = new Date();
        updateTime.setISO8601(getNodeValueByName(item, "updateTime"));

        var storage = item.getElementsByTagName("storage")[0];
        var s3bucket = getNodeValueByName(storage, "bucket");
        var s3prefix = getNodeValueByName(storage, "prefix");
        var error = item.getElementsByTagName("error")[0];
        var errorMsg = "";
        if (error) {
            errorMsg = getNodeValueByName(error, "message");
        }
        var progress = getNodeValueByName(item, "progress");
        if (progress.length > 0) {
            state += " " + progress;
        }

        return new BundleTask(id, instanceId, state, startTime, updateTime, s3bucket, s3prefix, errorMsg);
    },

    parseBundleInstanceResponse : function(xmlDoc)
    {
        var list = new Array();

        var items = xmlDoc.getElementsByTagName("bundleInstanceTask");
        for ( var i = 0; i < items.length; ++i) {
            list.push(this.retrieveBundleTaskFromResponse(items[i]));
        }

        return list;
    },

    parseDescribeBundleTasksResponse : function(xmlDoc)
    {
        var list = new Array();

        var items = xmlDoc.evaluate("/ec2:DescribeBundleTasksResponse/ec2:bundleInstanceTasksSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; ++i) {
            list.push(this.retrieveBundleTaskFromResponse(items.snapshotItem(i)));
        }

        return list;
    },

    describeBundleTasks : function(callback)
    {
        ec2ui_client.queryEC2("DescribeBundleTasks", [], this, true, "onCompleteDescribeBundleTasks", callback);
    },

    onCompleteDescribeBundleTasks : function(objResponse)
    {
        var list = this.parseDescribeBundleTasksResponse(objResponse.xmlDoc);

        ec2ui_model.updateBundleTasks(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    createS3Bucket : function(bucket, region, callback)
    {
        if (region) {
            content = "<CreateBucketConstraint><LocationConstraint>" + region + "</LocationConstraint></CreateBucketConstraint>";
        }
        ec2ui_client.queryS3("PUT", bucket, "/", {}, content, this, true, "onCompleteCreateS3Bucket", callback);
    },

    onCompleteCreateS3Bucket : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    listS3Buckets : function(callback)
    {
        ec2ui_client.queryS3("GET", "", "/", {}, content, this, true, "onCompleteListS3Buckets", callback);
    },

    onCompleteListS3Buckets : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.getElementsByTagName("Bucket");
        for ( var i = 0; i < items.length; i++) {
            var name = getNodeValueByName(items[i], "Name");
            var date = getNodeValueByName(items[i], "CreationDate");
            list.push(new S3Bucket(name, date));
        }

        ec2ui_model.updateS3Buckets(list);

        if (objResponse.callback) objResponse.callback(list);
    },

    getS3BucketAcl : function(bucket, callback)
    {
        ec2ui_client.queryS3("GET", bucket, "/?acl", {}, content, this, true, "onCompleteGetS3BucketAcl", callback);
    },

    onCompleteGetS3BucketAcl : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.getElementsByTagName("Grant");
        for ( var i = 0; i < items.length; i++) {
            var id = getNodeValueByName(items[i], "ID");
            var name = getNodeValueByName(items[i], "DisplayName");
            var perms = getNodeValueByName(items[i], "Permission");
            list.push(new S3BucketAcl(id, name, perms));
        }
        ec2ui_model.updateS3BucketAcls(objResponse.data, list);

        if (objResponse.callback) objResponse.callback(objResponse.data, list);
    },

    getS3BucketLocation : function(bucket, callback)
    {
        ec2ui_client.queryS3("GET", bucket, "/?location", {}, content, this, true, "onCompleteGetS3BucketLocation", callback);
    },

    onCompleteGetS3BucketLocation : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var region = getNodeValueByName(xmlDoc, "LocationConstraint");
        ec2ui_model.updateS3BucketLocation(objResponse.data, region);

        if (objResponse.callback) objResponse.callback(objResponse.data, region);
    },

    listS3BucketKeys : function(bucket, params, callback)
    {
        ec2ui_client.queryS3("GET", bucket, "/", {}, null, this, true, "onCompleteListS3BucketKeys", callback);
    },

    onCompleteListS3BucketKeys : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var bucket = getNodeValueByName(xmlDoc, "Name");
        var items = xmlDoc.getElementsByTagName("Contents");
        for ( var i = 0; i < items.length; i++) {
            var id = getNodeValueByName(items[i], "Key");
            var size = getNodeValueByName(items[i], "Size");
            var type = getNodeValueByName(items[i], "StorageClass");
            var etag = getNodeValueByName(items[i], "ETag");
            var mtime = getNodeValueByName(items[i], "LastModified");
            list.push(new S3BucketKey(id, type, size, mtime, etag));
        }

        ec2ui_model.updateS3BucketKeys(bucket, list);

        if (objResponse.callback) objResponse.callback(bucket, list);
    },

    deleteS3Bucket : function(bucket, callback)
    {
        ec2ui_client.queryS3("DELETE", bucket, "/", {}, null, this, true, "onCompleteDeleteS3Bucket", callback);
    },

    onCompleteDeleteS3Bucket : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    createS3BucketKey : function(bucket, key, params, callback)
    {
        ec2ui_client.queryS3("PUT", bucket, "/" + key, params, null, this, true, "onCompleteCreate3BucketKey", callback);
    },

    onCompleteCreateS3BucketKey : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    getS3BucketKey : function(bucket, key, params, file, callback)
    {
        ec2ui_client.downloadS3("GET", bucket, "/" + key, params, file, callback);
    },

    bundleInstance : function(instanceId, bucket, prefix, activeCred, callback)
    {
        // Generate the S3 policy string using the bucket and prefix
        var s3policy = generateS3Policy(bucket, prefix);
        log("S3 Policy[" + s3policy + "]");

        var s3polb64 = Base64.encode(s3policy);
        log("S3 Policy B64[" + s3polb64 + "]");

        // Sign the generated policy with the secret key
        var policySig = b64_hmac_sha1(activeCred.secretKey, s3polb64);
        log("S3 Policy Sig[" + policySig + "]");

        var params = []
        params.push([ "InstanceId", instanceId ]);
        params.push([ "Storage.S3.Bucket", bucket ]);
        params.push([ "Storage.S3.Prefix", prefix ]);
        params.push([ "Storage.S3.AWSAccessKeyId", activeCred.accessKey ]);
        params.push([ "Storage.S3.UploadPolicy", s3polb64 ]);
        params.push([ "Storage.S3.UploadPolicySignature", policySig ]);

        ec2ui_client.queryEC2("BundleInstance", params, this, true, "onCompleteBundleInstance", callback);
    },

    onCompleteBundleInstance : function(objResponse)
    {
        // Parse the XML Response
        var list = this.parseBundleInstanceResponse(objResponse.xmlDoc);

        // Ensure that the UI knows to update its view
        if (objResponse.callback) {
            objResponse.callback(list);
        }
    },

    cancelBundleTask : function(id, callback)
    {
        var params = []
        params.push([ "BundleId", id ]);

        ec2ui_client.queryEC2("CancelBundleTask", params, this, true, "onCompleteCancelBundleTask", callback);
    },

    onCompleteCancelBundleTask : function(objResponse)
    {
        // No need to parse the response since we only
        // need to refresh the list of bundle tasks.
        if (objResponse.callback) {
            objResponse.callback();
        }
    },

    describeKeypairs : function(callback)
    {
        ec2ui_client.queryEC2("DescribeKeyPairs", [], this, true, "onCompleteDescribeKeypairs", callback);
    },

    onCompleteDescribeKeypairs : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.getElementsByTagName("item");
        for ( var i = 0; i < items.length; i++) {
            var name = getNodeValueByName(items[i], "keyName");
            var fp = getNodeValueByName(items[i], "keyFingerprint");
            list.push(new KeyPair(name, fp));
        }

        ec2ui_model.updateKeypairs(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    createKeypair : function(name, callback)
    {
        ec2ui_client.queryEC2("CreateKeyPair", [ [ "KeyName", name ] ], this, true, "onCompleteCreateKeyPair", callback);
    },

    onCompleteCreateKeyPair : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var name = getNodeValueByName(xmlDoc, "keyName");
        var fp = getNodeValueByName(xmlDoc, "keyFingerprint");
        var keyMaterial = getNodeValueByName(xmlDoc, "keyMaterial");

        // I'm lazy, so for now the caller will just have to call describeKeypairs again to see
        // the new keypair.

        if (objResponse.callback) objResponse.callback(name, keyMaterial);
    },

    deleteKeypair : function(name, callback)
    {
        ec2ui_client.queryEC2("DeleteKeyPair", [ [ "KeyName", name ] ], this, true, "onCompleteDeleteKeyPair", callback);
    },

    onCompleteDeleteKeyPair : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    createAccessKey : function(callback)
    {
        ec2ui_client.queryIAM("CreateAccessKey", [], this, true, "onCompleteCreateAccessKey", callback);
    },

    onCompleteCreateAccessKey : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var key = getNodeValueByName(xmlDoc, "AccessKeyId");
        var secret = getNodeValueByName(xmlDoc, "SecretAccessKey");
        log("Access key = " + key + ", secret = " + secret)

        if (objResponse.callback) objResponse.callback(key, secret);
    },

    deleteAccessKey : function(name, callback)
    {
        ec2ui_client.queryIAM("DeleteAccessKey", [ [ "AccessKeyId", name ] ], this, true, "onCompleteDeleteAccessKey", callback);
    },

    onCompleteDeleteAccessKey : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    listAccessKeys : function(callback)
    {
        ec2ui_client.queryIAM("ListAccessKeys", [], this, true, "onCompleteListAccessKeys", callback);
    },

    onCompleteListAccessKeys : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.getElementsByTagName("member");
        for ( var i = 0; i < items.length; i++) {
            var name = getNodeValueByName(items[i], "AccessKeyId");
            var status = getNodeValueByName(items[i], "Status");
            list.push(new AccessKey(name, status, "", ec2ui_client.accessCode == name));
        }

        ec2ui_model.updateAccessKeys(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    importKeypair : function(name, keyMaterial, callback)
    {
        ec2ui_client.queryEC2("ImportKeyPair", [ [ "KeyName", name ], [ "PublicKeyMaterial", keyMaterial ] ], this, true, "onCompleteImportKeyPair", callback);
    },

    onCompleteImportKeyPair : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var name = getNodeValueByName(xmlDoc, "keyName");
        var fp = getNodeValueByName(xmlDoc, "keyFingerprint");

        if (objResponse.callback) objResponse.callback(name);
    },

    listSigningCertificates : function(callback)
    {
        ec2ui_client.queryIAM("ListSigningCertificates", [], this, true, "onCompleteListSigningCertificates", callback);
    },

    onCompleteListSigningCertificates : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.getElementsByTagName("member");
        for ( var i = 0; i < items.length; i++) {
            var name = getNodeValueByName(items[i], "CertificateId");
            var body = getNodeValueByName(items[i], "CertificateBody");
            list.push(new Certificate(name, body));
        }

        ec2ui_model.updateCerts(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    UploadSigningCertificate : function(body, callback)
    {
        ec2ui_client.queryIAM("UploadSigningCertificate", [ [ "CertificateBody", body ] ], this, true, "onCompleteUploadSigningCertificate", callback);
    },

    onCompleteUploadSigningCertificate : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var id = getNodeValueByName(xmlDoc, "CertificateId");

        if (objResponse.callback) objResponse.callback(id);
    },

    DeleteSigningCertificate : function(cert, callback)
    {
        ec2ui_client.queryIAM("DeleteSigningCertificate", [ [ "CertificateId", cert ] ], this, true, "onCompleteDeleteSigningCertificate", callback);
    },

    onCompleteDeleteSigningCertificate : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    describeRouteTables : function(callback)
    {
        ec2ui_client.queryEC2("DescribeRouteTables", [], this, true, "onCompleteDescribeRouteTables", callback);
    },

    onCompleteDescribeRouteTables : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.evaluate("/ec2:DescribeRouteTablesResponse/ec2:routeTableSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var routes = [], associations = []
            var id = getNodeValueByName(items.snapshotItem(i), "routeTableId");
            var vpcId = getNodeValueByName(items.snapshotItem(i), "vpcId");

            var routeItems = items.snapshotItem(i).getElementsByTagName("routeSet")[0].childNodes;
            for ( var j = 0; routeItems && j < routeItems.length; j++) {
                if (routeItems.item(j).nodeName == '#text') continue;
                var cidr = getNodeValueByName(routeItems.item(j), "destinationCidrBlock");
                var gateway = getNodeValueByName(routeItems.item(j), "gatewayId");
                var state = getNodeValueByName(routeItems.item(j), "state");
                routes.push(new Route(id, cidr, gateway, state));
            }
            var assocSet = items.snapshotItem(i).getElementsByTagName("associationSet")[0];
            var assocItems = assocSet.childNodes;
            if (assocItems) {
                for ( var j = 0; j < assocItems.length; j++) {
                    if (assocItems.item(j).nodeName == '#text') continue;
                    var aid = getNodeValueByName(assocItems.item(j), "routeTableAssociationId");
                    var table = getNodeValueByName(assocItems.item(j), "routeTableId");
                    var subnet = getNodeValueByName(assocItems.item(j), "subnetId");
                    associations.push(new RouteAssociation(aid, table, subnet));
                }
            }
            list.push(new RouteTable(id, vpcId, routes, associations));
        }
        ec2ui_model.updateRouteTables(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    createRouteTable : function(vpcId, callback)
    {
        ec2ui_client.queryEC2("CreateRouteTable", [["VpcId", vpcId]], this, true, "onCompleteCreateRouteTable", callback);
    },

    onCompleteCreateRouteTable : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    deleteRouteTable : function(tableId, callback)
    {
        ec2ui_client.queryEC2("DeleteRouteTable", [["RouteTableId", tableId]], this, true, "onCompleteDeleteRouteTable", callback);
    },

    onCompleteDeleteRouteTable : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    createRoute : function(tableId, cidr, gatewayId, callback)
    {
        ec2ui_client.queryEC2("CreateRoute", [["RouteTableId", tableId], ["DestinationCidrBlock", cidr], ["GatewayId", gatewayId]], this, true, "onCompleteCreateRoute", callback);
    },

    onCompleteCreateRoute : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    deleteRoute : function(tableId, cidr, callback)
    {
        ec2ui_client.queryEC2("DeleteRoute", [["RouteTableId", tableId], ["DestinationCidrBlock", cidr]], this, true, "onCompleteDeleteRoute", callback);
    },

    onCompleteDeleteRoute : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    AssociateRouteTable : function(tableId, subnetId, callback)
    {
        ec2ui_client.queryEC2("AssociateRouteTable", [["RouteTableId", tableId], ["SubnetId", subnetId]], this, true, "onCompleteAssociateRouteTable", callback);
    },

    onCompleteAssociateRouteTable : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    DisassociateRouteTable : function(assocId, callback)
    {
        ec2ui_client.queryEC2("DisassociateRouteTable", [["AssociationId", assocId]], this, true, "onCompleteDisassociateRouteTable", callback);
    },

    onCompleteDisassociateRouteTable : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    createNetworkInterface : function(subnetId, callback)
    {
        ec2ui_client.queryEC2("CreateNetworkInterface", [["subnetId", subnetId]], this, true, "onCompleteCreateNetworkInterface", callback);
    },

    onCompleteCreateNetworkInterface : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    deleteNetworkInterface : function(id, callback)
    {
        ec2ui_client.queryEC2("DeleteNetworkInterface", [["NetworkInterfaceId", id]], this, true, "onCompleteDeleteNetworkInterface", callback);
    },

    onCompleteDeleteNetworkInterface : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    describeNetworkInterfaces : function(callback)
    {
        ec2ui_client.queryEC2("DescribeNetworkInterfaces", [], this, true, "onCompleteDescribeNetworkInterfaces", callback);
    },

    onCompleteDescribeNetworkInterfaces : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.evaluate("/ec2:DescribeNetworkInterfcesResponse/ec2:networkInterfaceSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var id = getNodeValueByName(items.snapshotItem(i), "networkInterfaceId");
            var subnetId = getNodeValueByName(items.snapshotItem(i), "subnetId");
            var vpcId = getNodeValueByName(items.snapshotItem(i), "vpcId");
            var descr = getNodeValueByName(items.snapshotItem(i), "description");
            var status = getNodeValueByName(items.snapshotItem(i), "status");
            var mac = getNodeValueByName(items.snapshotItem(i), "macAddress");
            var ip = getNodeValueByName(items.snapshotItem(i), "privateIpAddress");
            var check = getNodeValueByName(items.snapshotItem(i), "sourceDestCheck");

            list.push(new NetworkInterface(id, status, descr, subnetId, vpcId, mac, ip, check));
        }

        ec2ui_model.updateNetworkInterfaces(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    describeSecurityGroups : function(callback)
    {
        ec2ui_client.queryEC2("DescribeSecurityGroups", [], this, true, "onCompleteDescribeSecurityGroups", callback);
    },

    parsePermissions: function(type, list, items)
    {
        if (items) {
            for ( var j = 0; j < items.length; j++) {
                if (items.item(j).nodeName == '#text') continue;
                var ipProtocol = getNodeValueByName(items.item(j), "ipProtocol");
                var fromPort = getNodeValueByName(items.item(j), "fromPort");
                var toPort = getNodeValueByName(items.item(j), "toPort");
                log("Group ipp [" + ipProtocol + ":" + fromPort + "-" + toPort + "]");

                var groups = items[j].getElementsByTagName("groups")[0];
                if (groups) {
                    var groupsItems = groups.childNodes;
                    for ( var k = 0; k < groupsItems.length; k++) {
                        if (groupsItems.item(k).nodeName == '#text') continue;
                        var srcGrp = { ownerId : getNodeValueByName(groupsItems[k], "userId"), id : getNodeValueByName(groupsItems[k], "groupId"), name : getNodeValueByName(groupsItems[k], "groupName") }
                        list.push(new Permission(type, ipProtocol, fromPort, toPort, srcGrp));
                    }
                }
                var ipRanges = items[j].getElementsByTagName("ipRanges")[0];
                if (ipRanges) {
                    var ipRangesItems = ipRanges.childNodes;
                    for ( var k = 0; k < ipRangesItems.length; k++) {
                        if (ipRangesItems.item(k).nodeName == '#text') continue;
                        var cidrIp = getNodeValueByName(ipRangesItems[k], "cidrIp");
                        list.push(new Permission(type, ipProtocol, fromPort, toPort, null, cidrIp));
                    }
                }
            }
        }
        return list
    },

    onCompleteDescribeSecurityGroups : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.evaluate("/ec2:DescribeSecurityGroupsResponse/ec2:securityGroupInfo/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for ( var i = 0; i < items.snapshotLength; i++) {
            var ownerId = getNodeValueByName(items.snapshotItem(i), "ownerId");
            var groupId = getNodeValueByName(items.snapshotItem(i), "groupId");
            var groupName = getNodeValueByName(items.snapshotItem(i), "groupName");
            var groupDescription = getNodeValueByName(items.snapshotItem(i), "groupDescription");
            var vpcId = getNodeValueByName(items.snapshotItem(i), "vpcId");
            log("Group name [id=" + groupId + ", name=" + groupName + ", vpcId=" + vpcId + "]");

            var ipPermissions = items.snapshotItem(i).getElementsByTagName("ipPermissions")[0];
            var ipPermissionsList = this.parsePermissions('Ingress', [], ipPermissions.childNodes);
            ipPermissions = items.snapshotItem(i).getElementsByTagName("ipPermissionsEgress")[0];
            ipPermissionsList = this.parsePermissions('Egress', ipPermissionsList, ipPermissions.childNodes);

            list.push(new SecurityGroup(groupId, ownerId, groupName, groupDescription, vpcId, ipPermissionsList));
        }

        ec2ui_model.updateSecurityGroups(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    createSecurityGroup : function(name, desc, vpcId, callback)
    {
        var params = [ [ "GroupName", name ], [ "GroupDescription", desc ] ]
        if (vpcId && vpcId != "") {
            params.push([ "VpcId", vpcId ])
        }
        ec2ui_client.queryEC2("CreateSecurityGroup", params, this, true, "onCompleteCreateSecurityGroup", callback, null);
    },

    onCompleteCreateSecurityGroup : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var id = getNodeValueByName(xmlDoc, "groupId");
        if (objResponse.callback) objResponse.callback(id);
    },

    deleteSecurityGroup : function(group, callback)
    {
        var params = typeof group == "object" ? [ [ "GroupId", group.id ] ] : [ [ "GroupName", group ] ]
        ec2ui_client.queryEC2("DeleteSecurityGroup", params, this, true, "onCompleteDeleteSecurityGroup", callback);
    },

    onCompleteDeleteSecurityGroup : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    authorizeSourceCIDR : function(type, group, ipProtocol, fromPort, toPort, cidrIp, callback)
    {
        var params = typeof group == "object" ? [ [ "GroupId", group.id ] ] : [ [ "GroupName", group ] ]
        params.push([ "IpPermissions.1.IpProtocol", ipProtocol ]);
        params.push([ "IpPermissions.1.FromPort", fromPort ]);
        params.push([ "IpPermissions.1.ToPort", toPort ]);
        params.push([ "IpPermissions.1.IpRanges.1.CidrIp", cidrIp ]);
        ec2ui_client.queryEC2("AuthorizeSecurityGroup" + type, params, this, true, "onCompleteAuthorizeSecurityGroup", callback);
    },

    revokeSourceCIDR : function(type, group, ipProtocol, fromPort, toPort, cidrIp, callback)
    {
        var params = typeof group == "object" ? [ [ "GroupId", group.id ] ] : [ [ "GroupName", group ] ]
        params.push([ "IpPermissions.1.IpProtocol", ipProtocol ]);
        params.push([ "IpPermissions.1.FromPort", fromPort ]);
        params.push([ "IpPermissions.1.ToPort", toPort ]);
        params.push([ "IpPermissions.1.IpRanges.1.CidrIp", cidrIp ]);
        ec2ui_client.queryEC2("RevokeSecurityGroup" + type, params, this, true, "onCompleteRevokeSecurityGroup", callback);
    },

    authorizeSourceGroup : function(type, group, ipProtocol, fromPort, toPort, srcGroup, callback)
    {
        var params = typeof group == "object" ? [ [ "GroupId", group.id ] ] : [ [ "GroupName", group ] ]
        params.push([ "IpPermissions.1.IpProtocol", ipProtocol ]);
        params.push([ "IpPermissions.1.FromPort", fromPort ]);
        params.push([ "IpPermissions.1.ToPort", toPort ]);
        if (group.vpcId && group.vpcId != "") {
            params.push([ "IpPermissions.1.Groups.1.GroupId", srcGroup.id ]);
        } else {
            params.push([ "IpPermissions.1.Groups.1.GroupName", srcGroup.name ]);
            params.push([ "IpPermissions.1.Groups.1.UserId", srcGroup.ownerId ]);
        }
        ec2ui_client.queryEC2("AuthorizeSecurityGroup" + type, params, this, true, "onCompleteAuthorizeSecurityGroup", callback);
    },

    onCompleteAuthorizeSecurityGroup : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    revokeSourceGroup : function(type, group, ipProtocol, fromPort, toPort, srcGroup, callback)
    {
        var params = group.id && group.id != "" ? [ [ "GroupId", group.id ] ] : [ [ "GroupName", group.name ] ]
        params.push([ "IpPermissions.1.IpProtocol", ipProtocol ]);
        params.push([ "IpPermissions.1.FromPort", fromPort ]);
        params.push([ "IpPermissions.1.ToPort", toPort ]);
        if (group.vpcId && group.vpcId != "") {
            params.push([ "IpPermissions.1.Groups.1.GroupId", srcGroup.id ]);
        } else {
            params.push([ "IpPermissions.1.Groups.1.GroupName", srcGroup.name ]);
            params.push([ "IpPermissions.1.Groups.1.UserId", srcGroup.ownerId ]);
        }
        ec2ui_client.queryEC2("RevokeSecurityGroup" + type, params, this, true, "onCompleteRevokeSecurityGroup", callback);
    },

    onCompleteRevokeSecurityGroup : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    rebootInstances : function(instanceIds, callback)
    {
        var params = []
        for ( var i in instanceIds) {
            params.push([ "InstanceId." + (i + 1), instanceIds[i] ]);
        }
        ec2ui_client.queryEC2("RebootInstances", params, this, true, "onCompleteRebootInstances", callback);
    },

    onCompleteRebootInstances : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    getConsoleOutput : function(instanceId, callback)
    {
        return ec2ui_client.queryEC2("GetConsoleOutput", [ [ "InstanceId", instanceId ] ], this, true, "onCompleteGetConsoleOutput", callback);
    },

    onCompleteGetConsoleOutput : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var instanceId = getNodeValueByName(xmlDoc, "instanceId");
        var timestamp = getNodeValueByName(xmlDoc, "timestamp");
        var output = xmlDoc.getElementsByTagName("output")[0];
        if (output.textContent) {
            output = Base64.decode(output.textContent);
            output = output.replace(/\x1b/mg, "\n").replace(/\r/mg, "").replace(/\n+/mg, "\n");
            //output = output.replace(/\n+/mg, "\n")
        } else {
            output = "";
        }

        if (objResponse.callback) objResponse.callback(instanceId, timestamp, output);
        return output;
    },

    describeAvailabilityZones : function(callback)
    {
        ec2ui_client.queryEC2("DescribeAvailabilityZones", [], this, true, "onCompleteDescribeAvailabilityZones", callback);
    },

    onCompleteDescribeAvailabilityZones : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.getElementsByTagName("item");
        for ( var i = 0; i < items.length; i++) {
            var name = getNodeValueByName(items[i], "zoneName");
            var state = getNodeValueByName(items[i], "zoneState");
            list.push(new AvailabilityZone(name, state));
        }

        ec2ui_model.updateAvailabilityZones(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    describeAddresses : function(callback)
    {
        ec2ui_client.queryEC2("DescribeAddresses", [], this, true, "onCompleteDescribeAddresses", callback);
    },

    onCompleteDescribeAddresses : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var list = new Array();
        var items = xmlDoc.getElementsByTagName("item");
        for ( var i = 0; i < items.length; i++) {
            var publicIp = getNodeValueByName(items[i], "publicIp");
            var instanceid = getNodeValueByName(items[i], "instanceId");
            var allocId = getNodeValueByName(items[i], "allocationId");
            var assocId = getNodeValueByName(items[i], "associationId");
            var domain = getNodeValueByName(items[i], "domain");
            list.push(new AddressMapping(publicIp, instanceid, allocId, assocId, domain));
        }

        this.addResourceTags(list, ec2ui_session.model.resourceMap.eips, "address");
        ec2ui_model.updateAddresses(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    allocateAddress : function(vpc, callback)
    {
        var params = vpc ? [["Domain", "vpc"]] : []
        ec2ui_client.queryEC2("AllocateAddress", params, this, true, "onCompleteAllocateAddress", callback);
    },

    onCompleteAllocateAddress : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var address = getNodeValueByName(xmlDoc, "publicIp");

        if (objResponse.callback) objResponse.callback(address);
    },

    releaseAddress : function(eip, callback)
    {
        var params = eip.allocationId ? [["AllocationId", eip.allocationId]] : [[ 'PublicIp', eip.address ]]
        ec2ui_client.queryEC2("ReleaseAddress", params, this, true, "onCompleteReleaseAddress", callback);
    },

    onCompleteReleaseAddress : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    associateAddress : function(eip, instanceid, callback)
    {
        var params = eip.allocationId ? [["AllocationId", eip.allocationId]] : [[ 'PublicIp', eip.address ]]
        params.push([ 'InstanceId', instanceid ])
        ec2ui_client.queryEC2("AssociateAddress", params, this, true, "onCompleteAssociateAddress", callback);
    },

    onCompleteAssociateAddress : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    disassociateAddress : function(eip, callback)
    {
        var params = eip.associationId ? [["AssociationId", eip.associationId]] : [[ 'PublicIp', eip.address ]]
        ec2ui_client.queryEC2("DisassociateAddress", params, this, true, "onCompleteDisassociateAddress", callback);
    },

    onCompleteDisassociateAddress : function(objResponse)
    {
        if (objResponse.callback) objResponse.callback();
    },

    describeRegions : function(callback)
    {
        ec2ui_client.queryEC2("DescribeRegions", [], this, true, "onCompleteDescribeRegions", callback);
    },

    onCompleteDescribeRegions : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;

        var items = xmlDoc.evaluate("/ec2:DescribeRegionsResponse/ec2:regionInfo/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        var endPointMap = new Object();
        for ( var i = 0; i < items.snapshotLength; ++i) {
            var name = getNodeValueByName(items.snapshotItem(i), "regionName");
            var url = getNodeValueByName(items.snapshotItem(i), "regionEndpoint");
            if (url.indexOf("https://") != 0) {
                url = "https://" + url;
            }
            endPointMap[name] = new Endpoint(name, url);
            log("name: " + name + ", url: " + url);
        }

        if (objResponse.callback) {
            objResponse.callback(endPointMap);
        }
    },

    onResponseComplete : function(responseObject)
    {
        // For async requests, we should always call back
        if (!responseObject.isAsync && responseObject.hasErrors) {
            return;
        }

        eval("this." + responseObject.requestType + "(responseObject)");
    },

    describeLoadBalancers : function(callback)
    {
        ec2ui_client.queryELB("DescribeLoadBalancers", [], this, true, "onCompleteDescribeLoadBalancers", callback);
    },

    onCompleteDescribeLoadBalancers : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var list = new Array();
        var items = xmlDoc.getElementsByTagName("member");
        for ( var i = 0; i < items.length; i++) {
            var LoadBalancerName = getNodeValueByName(items[i], "LoadBalancerName");
            var CreatedTime = getNodeValueByName(items[i], "CreatedTime");
            var DNSName = getNodeValueByName(items[i], "DNSName");
            var Instances = new Array();
            var InstanceId = items[i].getElementsByTagName("InstanceId");
            for ( var j = 0; j < InstanceId.length; j++) {
                Instances.push(InstanceId[j].firstChild.nodeValue);
            }

            var listener = items[i].getElementsByTagName("ListenerDescriptions");
            for ( var k = 0; k < listener.length; k++) {
                var Protocol = getNodeValueByName(listener[k], "Protocol");
                var LoadBalancerPort = getNodeValueByName(listener[k], "LoadBalancerPort");
                var InstancePort = getNodeValueByName(listener[k], "InstancePort");
            }

            var HealthCheck = items[i].getElementsByTagName("HealthCheck");
            for ( var k = 0; k < HealthCheck.length; k++) {
                var Interval = getNodeValueByName(HealthCheck[k], "Interval");
                var Timeout = getNodeValueByName(HealthCheck[k], "Timeout");
                var HealthyThreshold = getNodeValueByName(HealthCheck[k], "HealthyThreshold");
                var UnhealthyThreshold = getNodeValueByName(HealthCheck[k], "UnhealthyThreshold");
                var Target = getNodeValueByName(HealthCheck[k], "Target");
            }

            var azone = new Array();
            var AvailabilityZones = items[i].getElementsByTagName("AvailabilityZones");
            for ( var k = 0; k < AvailabilityZones.length; k++) {
                var zone = AvailabilityZones[k].getElementsByTagName("member");
                for ( var j = 0; j < zone.length; j++) {
                    azone.push(zone[j].firstChild.nodeValue);
                }
            }

            var AppCookieStickinessPolicies = items[i].getElementsByTagName("AppCookieStickinessPolicies");
            for ( var k = 0; k < AppCookieStickinessPolicies.length; k++) {
                var CookieName = getNodeValueByName(AppCookieStickinessPolicies[k], "CookieName");
                var APolicyName = getNodeValueByName(AppCookieStickinessPolicies[k], "PolicyName");
            }

            var LBCookieStickinessPolicies = items[i].getElementsByTagName("LBCookieStickinessPolicies");
            for ( var k = 0; k < LBCookieStickinessPolicies.length; k++) {
                var CookieExpirationPeriod = getNodeValueByName(LBCookieStickinessPolicies[k], "CookieExpirationPeriod");
                var CPolicyName = getNodeValueByName(LBCookieStickinessPolicies[k], "PolicyName");
            }

            if (LoadBalancerName != '' && CreatedTime != '') {
                list.push(new LoadBalancer(LoadBalancerName, CreatedTime, DNSName, Instances, Protocol, LoadBalancerPort, InstancePort, Interval, Timeout, HealthyThreshold, UnhealthyThreshold, Target, azone, CookieName, APolicyName, CookieExpirationPeriod, CPolicyName));
            }
        }
        ec2ui_model.updateLoadbalancer(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    describeInstanceHealth : function(LoadBalancerName, callback)
    {
        params = []
        params.push([ "LoadBalancerName", LoadBalancerName ]);

        ec2ui_client.queryELB("DescribeInstanceHealth", params, this, true, "oncompletedescribeInstanceHealth", callback);
    },

    oncompletedescribeInstanceHealth : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var list = new Array();
        var items = xmlDoc.getElementsByTagName("member");
        for ( var i = 0; i < items.length; i++) {
            var Description = getNodeValueByName(items[i], "Description");
            var State = getNodeValueByName(items[i], "State");
            var InstanceId = getNodeValueByName(items[i], "InstanceId");
            var ReasonCode = getNodeValueByName(items[i], "ReasonCode");

            list.push(new InstanceHealth(Description, State, InstanceId, ReasonCode));
        }

        ec2ui_model.updateInstanceHealth(list);
        if (objResponse.callback) objResponse.callback(list);
    },

    deleteLoadBalancer : function(LoadBalancerName, callback)
    {
        params = []
        params.push([ "LoadBalancerName", LoadBalancerName ]);

        ec2ui_client.queryELB("DeleteLoadBalancer", params, this, true, "oncompleteDeleteLoadBalancer", callback);
    },

    oncompleteDeleteLoadBalancer : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = getNodeValueByName(xmlDoc, "member");
        if (objResponse.callback) objResponse.callback(items);
    },

    CreateLoadBalancer : function(LoadBalancerName, Protocol, elbport, instanceport, Zone, callback)
    {
        var params = []
        params.push([ "LoadBalancerName", LoadBalancerName ]);

        params.push([ "AvailabilityZones.member.1", Zone ]);
        params.push([ "Listeners.member.Protocol", Protocol ]);
        if (Protocol == "HTTPS") {
            params.push([ "Listeners.member.SSLCertificateId", "arn:aws:iam::322191361670:server-certificate/testCert" ]);
        }
        params.push([ "Listeners.member.LoadBalancerPort", elbport ]);
        params.push([ "Listeners.member.InstancePort", instanceport ]);
        ec2ui_client.queryELB("CreateLoadBalancer", params, this, true, "onCompleteCreateLoadBalancer", callback);
    },

    onCompleteCreateLoadBalancer : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = getNodeValueByName(xmlDoc, "member");
        if (objResponse.callback) objResponse.callback(items);
    },

    ConfigureHealthCheck : function(LoadBalancerName, pingprotocol, pingport, pingpath, Interval, Timeout, HealthyThreshold, UnhealthyThreshold, callback)
    {
        var params = []
        if (pingprotocol != null) {
            if (pingprotocol == 'HTTP') {
                params.push([ "HealthCheck.Target", pingprotocol + ":" + pingport + "/" + pingpath ]);
            } else {
                params.push([ "HealthCheck.Target", pingprotocol + ":" + pingport ]);
            }
        }
        if (LoadBalancerName != null) params.push([ "LoadBalancerName", LoadBalancerName ]);
        if (Interval != null) params.push([ "HealthCheck.Interval", Interval ]);
        if (Timeout != null) params.push([ "HealthCheck.Timeout", Timeout ]);
        if (HealthyThreshold != null) params.push([ "HealthCheck.HealthyThreshold", HealthyThreshold ]);
        if (UnhealthyThreshold != null) params.push([ "HealthCheck.UnhealthyThreshold", UnhealthyThreshold ]);

        ec2ui_client.queryELB("ConfigureHealthCheck", params, this, true, "onCompleteConfigureHealthCheck", callback);
    },

    onCompleteConfigureHealthCheck : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = getNodeValueByName(xmlDoc, "HealthCheck");
        if (objResponse.callback) objResponse.callback(items);

    },

    RegisterInstancesWithLoadBalancer : function(LoadBalancerName, RegInstance, callback)
    {
        params = []
        params.push([ "LoadBalancerName", LoadBalancerName ]);
        params.push([ "Instances.member.InstanceId", RegInstance ]);
        ec2ui_client.queryELB("RegisterInstancesWithLoadBalancer", params, this, true, "onCompleteRegisterInstancesWithLoadBalancer", callback);
    },

    onCompleteRegisterInstancesWithLoadBalancer : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = getNodeValueByName(xmlDoc, "member");
        if (objResponse.callback) objResponse.callback(items);
    },

    DeregisterInstancesWithLoadBalancer : function(LoadBalancerName, RegInstance, callback)
    {
        params = []
        params.push([ "LoadBalancerName", LoadBalancerName ]);
        params.push([ "Instances.member.InstanceId", RegInstance ]);

        ec2ui_client.queryELB("DeregisterInstancesFromLoadBalancer", params, this, true, "onCompleteDeregisterInstancesWithLoadBalancer", callback);
    },

    onCompleteDeregisterInstancesWithLoadBalancer : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = getNodeValueByName(xmlDoc, "member");
        if (objResponse.callback) objResponse.callback(items);
    },

    Enableazonewithloadbalancer : function(LoadBalancerName, Zone, callback)
    {
        params = []
        params.push([ "LoadBalancerName", LoadBalancerName ]);
        params.push([ "AvailabilityZones.member.1", Zone ]);

        ec2ui_client.queryELB("EnableAvailabilityZonesForLoadBalancer", params, this, true, "onCompleteenableazonewithloadbalancer", callback);
    },

    onCompleteenableazonewithloadbalancer : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = getNodeValueByName(xmlDoc, "member");
        if (objResponse.callback) objResponse.callback(items);
    },

    Disableazonewithloadbalancer : function(LoadBalancerName, Zone, callback)
    {
        params = []
        params.push([ "LoadBalancerName", LoadBalancerName ]);
        params.push([ "AvailabilityZones.member.1", Zone ]);

        ec2ui_client.queryELB("DisableAvailabilityZonesForLoadBalancer", params, this, true, "onCompletedisableazonewithloadbalancer", callback);
    },

    onCompletedisableazonewithloadbalancer : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = getNodeValueByName(xmlDoc, "member");
        if (objResponse.callback) objResponse.callback(items);
    },

    EditHealthCheck : function(LoadBalancerName, Target, Interval, Timeout, HealthyThreshold, UnhealthyThreshold, callback)
    {
        var params = []
        params.push([ "HealthCheck.Target", Target ]);
        params.push([ "LoadBalancerName", LoadBalancerName ]);
        params.push([ "HealthCheck.Interval", Interval ]);
        params.push([ "HealthCheck.Timeout", Timeout ]);
        params.push([ "HealthCheck.HealthyThreshold", HealthyThreshold ]);
        params.push([ "HealthCheck.UnhealthyThreshold", UnhealthyThreshold ]);

        ec2ui_client.queryELB("ConfigureHealthCheck", params, this, true, "onCompleteEditHealthCheck", callback);
    },

    onCompleteEditHealthCheck : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = getNodeValueByName(xmlDoc, "HealthCheck");
        if (objResponse.callback) objResponse.callback(items);

    },

    CreateAppCookieSP : function(LoadBalancerName, CookieName, callback)
    {
        var uniqueid = new Date;
        var id = uniqueid.getTime();

        var PolicyName = "AWSConsolePolicy-" + id;
        params = []
        params.push([ "LoadBalancerName", LoadBalancerName ]);
        params.push([ "CookieName", CookieName ]);
        params.push([ "PolicyName", PolicyName ]);
        ec2ui_client.queryELB("CreateAppCookieStickinessPolicy", params, this, true, "oncompleteCreateAppCookieSP", callback);
        //no = no + 1;
    },

    oncompleteCreateAppCookieSP : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = getNodeValueByName(xmlDoc, "member");
        if (objResponse.callback) objResponse.callback(items);
    },

    CreateLBCookieSP : function(LoadBalancerName, CookieExpirationPeriod, callback)
    {
        var uniqueid = new Date;
        var id = uniqueid.getTime();

        var PolicyName = "AWSConsolePolicy-" + id;
        params = []
        params.push([ "CookieExpirationPeriod", CookieExpirationPeriod ]);
        params.push([ "LoadBalancerName", LoadBalancerName ]);
        params.push([ "PolicyName", PolicyName ]);
        ec2ui_client.queryELB("CreateLBCookieStickinessPolicy", params, this, true, "oncompleteCreateLBCookieSP", callback);
    },

    oncompleteCreateLBCookieSP : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = getNodeValueByName(xmlDoc, "member");
        if (objResponse.callback) objResponse.callback(items);
    },

    DeleteLoadBalancerPolicy : function(LoadBalancerName, policy, callback)
    {
        params = []
        params.push([ "LoadBalancerName", LoadBalancerName ]);

        params.push([ "PolicyName", policy ]);
        ec2ui_client.queryELB("DeleteLoadBalancerPolicy", params, this, true, "oncompleteDeleteLoadBalancerPolicy", callback);
    },

    oncompleteDeleteLoadBalancerPolicy : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = getNodeValueByName(xmlDoc, "member");
        if (objResponse.callback) objResponse.callback(items);
    },

    uploadservercertificate : function(ServerCertificateName, CertificateBody, PrivateKey, Path, callback)
    {
        params = []
        params.push([ "ServerCertificateName", ServerCertificateName ]);
        params.push([ "CertificateBody", CertificateBody ]);
        params.push([ "PrivateKey", PrivateKey ]);
        if (Path != null) params.push([ "Path", Path ]);
        ec2ui_client.queryIAM("UploadServerCertificate", params, this, true, "oncompleteuploadserversertificate", callback);
    },

    oncompleteuploadservercertificate : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = getNodeValueByName(xmlDoc, "ServerCertificateMetadata");
        if (objResponse.callback) objResponse.callback(items);
    },

    createTags : function(resIds, tags, callback)
    {
        var params = new Array();

        for ( var i = 0; i < resIds.length; i++) {
            params.push([ "ResourceId." + (i + 1), resIds[i] ]);
            params.push([ "Tag." + (i + 1) + ".Key", tags[i][0] ]);
            params.push([ "Tag." + (i + 1) + ".Value", tags[i][1] ]);
        }

        ec2ui_client.queryEC2("CreateTags", params, this, true, "onCompleteCreateTags", callback);
    },

    onCompleteCreateTags : function(objResponse)
    {
        if (objResponse.callback) {
            objResponse.callback();
        }
    },

    deleteTags : function(resIds, keys, callback)
    {
        var params = new Array();

        for ( var i = 0; i < resIds.length; i++) {
            params.push([ "ResourceId." + (i + 1), resIds[i] ]);
            params.push([ "Tag." + (i + 1) + ".Key", keys[i] ]);
        }

        ec2ui_client.queryEC2("DeleteTags", params, this, true, "onCompleteDeleteTags", callback);
    },

    onCompleteDeleteTags : function(objResponse)
    {
        if (objResponse.callback) {
            objResponse.callback();
        }
    },

    describeTags : function(resIds, callback)
    {
        var params = new Array();

        for ( var i = 0; i < resIds.length; i++) {
            params.push([ "Filter." + (i + 1) + ".Name", "resource-id" ]);
            params.push([ "Filter." + (i + 1) + ".Value.1", resIds[i] ]);
        }

        ec2ui_client.queryEC2("DescribeTags", params, this, true, "onCompleteDescribeTags", callback);
    },

    onCompleteDescribeTags : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = xmlDoc.evaluate("/ec2:DescribeTagsResponse/ec2:tagSet/ec2:item", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        var tags = new Array();

        for ( var i = 0; i < items.snapshotLength; ++i) {
            var resid = getNodeValueByName(items.snapshotItem(i), "resourceId");
            var key = getNodeValueByName(items.snapshotItem(i), "key");
            var value = getNodeValueByName(items.snapshotItem(i), "value");
            tags.push([ resid, key, value ]);
        }

        if (objResponse.callback) {
            objResponse.callback(tags);
        }
    },

    describeInstanceAttribute : function(instanceId, attribute, callback)
    {
        var params = new Array();
        params.push([ "InstanceId", instanceId ]);
        params.push([ "Attribute", attribute ]);
        ec2ui_client.queryEC2("DescribeInstanceAttribute", params, this, true, "onCompleteDescribeInstanceAttribute", callback);
    },

    onCompleteDescribeInstanceAttribute : function(objResponse)
    {
        var xmlDoc = objResponse.xmlDoc;
        var items = xmlDoc.evaluate("/ec2:DescribeInstanceAttributeResponse/*", xmlDoc, this.getNsResolver(), XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        var value = getNodeValueByName(items.snapshotItem(2), "value");

        if (objResponse.callback) {
            objResponse.callback(value);
        }
    },

    modifyInstanceAttribute : function(instanceId, attribute, callback)
    {
        var params = new Array();
        var name = attribute[0];
        var value = attribute[1];

        params.push([ "InstanceId", instanceId ]);
        params.push([ name + ".Value", value ]);

        ec2ui_client.queryEC2("ModifyInstanceAttribute", params, this, true, "onCompleteModifyInstanceAttribute", callback);
    },

    onCompleteModifyInstanceAttribute : function(objResponse)
    {
        if (objResponse.callback) {
            objResponse.callback();
        }
    }
};
