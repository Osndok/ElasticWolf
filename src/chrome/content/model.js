// "Classes" representing objects like AMIs, Instances etc.
function Credential(name, accessKey, secretKey, endPoint)
{
    this.name = name;
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.endPoint = endPoint ? endPoint : "";

    this.toStr = function()
    {
        return this.accessKey + ";;" + this.secretKey + ";;" + this.endPoint;
    }
}

function User(id, name, path, arn)
{
    this.id = id
    this.name = name
    this.path = path
    this.arn = arn
}

function S3Bucket(name, mtime, owner)
{
    this.name = name
    this.mtime = mtime
    this.owner = owner
    this.region = ""
    this.acls = null
    this.keys = []
}

function S3BucketAcl(id, type, name, permission)
{
    this.id = id
    this.type = type
    this.name = name
    this.permission = permission
    this.toStr = function() {
       return (this.name ? this.name : this.id ? this.id : "ALL") + "=" + this.permission
    }
}

function S3BucketKey(bucket, name, type, size, mtime, owner, etag)
{
    this.bucket = bucket
    this.name = name
    this.type = type
    this.size = size
    this.mtime = mtime
    this.etag = etag
    this.owner = owner
}

function AccountIdName(id, name)
{
    this.accountid = id;
    this.displayname = name;
}

function Tag(name, value)
{
    this.name = name || ""
    this.value = value || ""
    this.toStr = function()
    {
        return this.name + "=" + this.value
    }
}

function NetworkInterface(id, status, descr, subnetId, vpcId, macAddress, privateIpAddress, sourceDestCheck)
{
    this.id = id
    this.status = status
    this.descr = descr
    this.subnetId = subnetId
    this.vpcId = vpcId
    this.macAddress = macAddress
    this.privateIpAddress = privateIpAddress
    this.sourceDestCheck = sourceDestCheck
}

function NetworkAclAssociation(id, acl, subnet)
{
    this.id = id
    this.aclId = acl
    this.subnetId = subnet
    this.cidr = ""
}

function NetworkAclEntry(num, proto, action, egress, cidr, icmp, ports)
{
    this.num = num
    this.proto = proto
    this.action = action
    this.egress = egress
    this.cidr = cidr
    this.icmp = icmp ? icmp : []
    this.ports = ports ? ports : []
}

function NetworkAcl(id, vpcId, dflt, rules, assocs)
{
    this.id = id
    this.vpcId = vpcId
    this.dflt = dflt
    this.rules = rules
    this.associations = assocs
    this.subnets = ""
}

function Endpoint(name, url)
{
    if (!name || name == "") {
        this.name = url.replace(/(https?:\/\/|ec2|amazonaws|com|\.)/g, "")
    } else {
        this.name = name;
    }
    this.url = url;

    this.toJSONString = function()
    {
        var pairs = new Array();
        for (k in this) {
            if (this.hasOwnProperty(k)) {
                v = this[k];
                if (v != null && typeof v != "function") {
                    log("adding key toJSONString: " + k);
                    pairs.push("'" + k + "':'" + v + "'");
                }
            }
        }
        return "({" + pairs.join(',') + "})";
    };

    return this;
}

function AMI(id, location, state, owner, isPublic, arch, platform, aki, ari, rootDeviceType, ownerAlias, name, description, snapshotId, tag)
{
    this.id = id;
    this.location = location;
    this.state = state;
    this.owner = owner;
    this.isPublic = isPublic;
    this.arch = arch;
    this.platform = platform;
    if (tag) this.tag = tag;
    this.aki = aki;
    this.ari = ari;
    this.rootDeviceType = rootDeviceType;
    this.ownerAlias = ownerAlias;
    this.name = name;
    this.description = description;
    this.snapshotId = snapshotId;
}

function Snapshot(id, volumeId, status, startTime, progress, volumeSize, description, owner, ownerAlias, tag)
{
    this.id = id;
    this.volumeId = volumeId;
    this.status = status;
    this.startTime = startTime.strftime('%Y-%m-%d %H:%M:%S');
    this.progress = progress;
    this.description = description;
    this.volumeSize = volumeSize;
    this.owner = owner;
    this.ownerAlias = ownerAlias;

    if (tag) {
        this.tag = tag;
        __addNameTagToModel__(tag, this);
    }
}

function Volume(id, size, snapshotId, zone, status, createTime, instanceId, device, attachStatus, attachTime, tag)
{
    this.id = id;
    this.size = size;
    this.snapshotId = snapshotId;
    this.availabilityZone = zone;
    this.status = status;
    this.createTime = createTime.strftime('%Y-%m-%d %H:%M:%S');
    this.instanceId = instanceId;
    this.device = device;
    this.attachStatus = attachStatus;
    if (attachStatus != "") {
        this.attachTime = attachTime.strftime('%Y-%m-%d %H:%M:%S');
    }
    if (tag) {
        this.tag = tag;
        __addNameTagToModel__(tag, this);
    }
}

function Instance(resId, ownerId, groupList, instanceId, imageId, kernelId, ramdiskId, state, publicDnsName, privateDnsName, privateIpAddress, keyName, reason, amiLaunchIdx, instanceType, launchTime, placement, platform, tag, vpcId, subnetId, rootDeviceType)
{
    this.resId = resId;
    this.ownerId = ownerId;
    this.groupList = groupList;
    this.id = instanceId;
    this.imageId = imageId;
    this.kernelId = kernelId;
    this.ramdiskId = ramdiskId;
    this.state = state;
    this.publicDnsName = publicDnsName;
    this.privateDnsName = privateDnsName;
    this.privateIpAddress = privateIpAddress;
    this.keyName = keyName;
    this.reason = reason;
    this.amiLaunchIdx = amiLaunchIdx;
    this.instanceType = instanceType;
    this.launchTime = launchTime;
    this.launchTimeDisp = launchTime.strftime('%Y-%m-%d %H:%M:%S');

    this.groups = this.groupList.sort().join(', ');

    this.placement = placement;
    this.platform = platform;
    this.vpcId = vpcId;
    this.subnetId = subnetId;

    if (tag) {
        this.tag = tag;
        __addNameTagToModel__(tag, this);
    }

    this.rootDeviceType = rootDeviceType;
}

function Certificate(name, body)
{
    this.name = name
    this.body = body
}

function KeyPair(name, fingerprint)
{
    this.name = name;
    this.fingerprint = fingerprint;
}

function AccessKey(name, status, secret, current)
{
    this.name = name;
    this.status = status;
    this.secret = secret
    this.current = current
}

function SecurityGroup(id, ownerId, name, description, vpcId, permissions)
{
    this.id = id
    this.ownerId = ownerId;
    this.name = name;
    this.description = description;
    this.vpcId = vpcId
    this.permissions = permissions;
}

function Permission(type, protocol, fromPort, toPort, srcGroup, cidrIp)
{
    this.type = type
    this.protocol = protocol;
    this.fromPort = fromPort;
    this.toPort = toPort;
    this.srcGroup = srcGroup;
    this.group = srcGroup ? srcGroup.id + ":" + srcGroup.name : ""
    this.cidrIp = cidrIp;
}

function Route(tableId, cidr, gatewayId, state)
{
    this.tableId = tableId
    this.cidr = cidr
    this.gatewayId = gatewayId
    this.state = state
}

function RouteAssociation(id, tableId, subnetId)
{
    this.id = id
    this.tableId = tableId || ""
    this.subnetId = subnetId || ""
}

function RouteTable(id, vpcId, routes, associations)
{
    this.id = id
    this.vpcId = vpcId
    this.routes = routes
    this.associations = associations
}

function AvailabilityZone(name, state)
{
    this.name = name;
    this.state = state;
}

function AddressMapping(address, instanceid, allocId, assocId, domain, tag)
{
    this.address = address;
    this.instanceid = instanceid;
    this.allocationId = allocId || ""
    this.associationId = assocId || ""
    this.domain = domain || ""
    this.tag = tag || ""
}

function BundleTask(id, instanceId, state, startTime, updateTime, s3bucket, s3prefix, errorMsg)
{
    this.id = id;
    this.instanceId = instanceId;
    this.state = state;
    this.startTime = startTime.strftime('%Y-%m-%d %H:%M:%S');
    this.updateTime = updateTime.strftime('%Y-%m-%d %H:%M:%S');
    this.s3bucket = s3bucket;
    this.s3prefix = s3prefix;
    this.errorMsg = errorMsg;
}

function LeaseOffering(id, type, az, duration, fPrice, uPrice, desc, offering, tenancy)
{
    this.id = id;
    this.instanceType = type;
    this.azone = az;
    this.duration = duration;
    this.fixedPrice = fPrice;
    this.usagePrice = uPrice;
    this.description = desc;
    this.offering = offering;
    this.tenancy = tenancy;
}

function ReservedInstance(id, type, az, start, duration, fPrice, uPrice, count, desc, state, tenancy)
{
    this.id = id;
    this.instanceType = type;
    this.azone = az;
    this.startTime = start;
    this.start = start.strftime('%Y-%m-%d %H:%M:%S');
    this.duration = duration;
    this.fixedPrice = fPrice;
    this.usagePrice = uPrice;
    this.count = count;
    this.description = desc;
    this.state = state;
    this.tenancy = tenancy
}

function Vpc(id, cidr, state, dhcpOptionsId, tag)
{
    this.id = id;
    this.cidr = cidr;
    this.state = state;
    this.dhcpOptionsId = dhcpOptionsId;
    if (tag) this.tag = tag;
}

function Subnet(id, vpcId, cidr, state, availableIp, availabilityZone, tag)
{
    this.id = id;
    this.vpcId = vpcId;
    this.cidr = cidr;
    this.state = state;
    this.availableIp = availableIp;
    this.availabilityZone = availabilityZone;
    if (tag) this.tag = tag;
}

function DhcpOptions(id, options, tag)
{
    this.id = id;
    this.options = options;
    if (tag) this.tag = tag;
}

function VpnConnection(id, vgwId, cgwId, type, state, config, attachments, tag)
{
    this.id = id;
    this.vgwId = vgwId;
    this.cgwId = cgwId;
    this.type = type;
    this.state = state;
    this.config = config;
    this.attachments = attachments;

    if (tag) this.tag = tag;
}

function InternetGateway(id, vpcs, tags)
{
    this.id = id
    this.vpcs = vpcs || []
    this.tags = tags || []

    this.toStr = function()
    {
        var text = this.id + " "
        if (this.vpcs.length) {
            text += "(" + this.vpcs + ")"
        }
        if (this.tags.length) {
            for (var i in this.tags) {
                text += ", " + this.tags[i].toStr()
            }
        }
        return text
    }
}

function VpnGateway(id, availabilityZone, state, type, attachments, tag)
{
    this.id = id;
    this.availabilityZone = availabilityZone;
    this.state = state;
    this.type = type;
    this.attachments = attachments;

    if (tag) this.tag = tag;
}

function VpnGatewayAttachment(vpcId, vgwId, state)
{
    this.vpcId = vpcId;
    this.vgwId = vgwId;
    this.state = state;
}

function CustomerGateway(id, ipAddress, bgpAsn, state, type, tag)
{
    this.id = id;
    this.ipAddress = ipAddress;
    this.bgpAsn = bgpAsn;
    this.state = state;
    this.type = type;

    if (tag) this.tag = tag;
}

function LoadBalancer(LoadBalancerName, CreatedTime, DNSName, Instances, Protocol, LoadBalancerPort, InstancePort, Interval, Timeout, HealthyThreshold, UnhealthyThreshold, Target, azone, CookieName, APolicyName, CookieExpirationPeriod, CPolicyName)
{
    this.LoadBalancerName = LoadBalancerName;
    this.CreatedTime = CreatedTime;
    this.DNSName = DNSName;
    this.InstanceId = Instances;
    this.Protocol = Protocol;
    this.LoadBalancerPort = LoadBalancerPort;
    this.InstancePort = InstancePort;
    this.Interval = Interval;
    this.Timeout = Timeout;
    this.HealthyThreshold = HealthyThreshold;
    this.UnhealthyThreshold = UnhealthyThreshold;
    this.Target = Target;
    this.zone = azone;
    this.CookieName = CookieName;
    this.APolicyName = APolicyName;
    this.CookieExpirationPeriod = CookieExpirationPeriod;
    this.CPolicyName = CPolicyName;
}

function InstanceHealth(Description, State, InstanceId, ReasonCode)
{
    this.Description = Description;
    this.State = State;
    this.InstanceId = InstanceId;
    this.ReasonCode = ReasonCode;
}

String.prototype.trim = function()
{
    return this.replace(/^\s+|\s+$/g, "");
}

// Global model: home to things like lists of data that need to be shared (known
// AMIs, keypairs etc)
var ew_model = {
    components : new Array(),
    componentInterests : new Object(),

    volumes : null,
    images : null,
    snapshots : null,
    instances : null,
    keypairs : null,
    accesskeys : null,
    certs : null,
    azones : null,
    securityGroups : null,
    addresses : null,
    bundleTasks : null,
    offerings : null,
    reservedInstances : null,
    loadbalancer : null,
    InstanceHealth : null,
    subnets : null,
    vpcs : null,
    dhcpOptions : null,
    vpnConnections : null,
    vpnGateways : null,
    customerGateways : null,
    internetGateways : null,
    routetables: null,
    networkAcls: null,
    networkInterfaces: null,
    s3buckets: null,

    resourceMap : {
        instances : 0,
        volumes : 1,
        snapshots : 2,
        images : 3,
        eips : 4,
        vpcs : 5,
        subnets : 6,
        dhcpOptions : 7,
        vpnConnections : 8,
        vpnGateways : 9,
        customerGateways : 10,
        internetGateways : 11,
        routetables: 12,
        networkAcls: 13,
        networkInterfaces: 14,
        s3buckets: 15,
        users: 16
    },

    amiIdManifestMap : {},

    invalidate : function()
    {
        // reset all lists, these will notify their associated views
        this.updateImages(null);
        this.updateInstances(null);
        this.updateKeypairs(null);
        this.updateAccessKeys(null);
        this.updateCerts(null);
        this.updateSecurityGroups(null);
        this.updateAvailabilityZones(null);
        this.updateAddresses(null);
        this.updateVolumes(null);
        this.updateSnapshots(null);
        this.updateBundleTasks(null);
        this.updateLeaseOfferings(null);
        this.updateReservedInstances(null);
        this.updateLoadbalancer(null);
        this.updateInstanceHealth(null);
        this.updateVpcs(null);
        this.updateSubnets(null);
        this.updateDhcpOptions(null);
        this.updateVpnConnections(null);
        this.updateVpnGateways(null);
        this.updateCustomerGateways(null);
        this.updateInternetGateways(null);
        this.updateRouteTables(null);
        this.updateNetworkAcls(null);
        this.updateNetworkInterfaces(null);
        this.updateS3Buckets(null);
        this.updateUsers(null);
    },

    getModel : function(name)
    {
        switch (name) {
        case "volumes":
            return this.volumes;
        case "images":
            return this.images;
        case "snapshots":
            return this.snapshots;
        case "instances":
            return this.instances;
        case "keypairs":
            return this.keypairs;
        case "accesskeys":
            return this.accesskeys;
        case "certs":
            return this.certs;
        case "azones":
            return this.azones;
        case "securitygroups":
            return this.securityGroups;
        case "addresses":
            return this.addresses;
        case "bundleTasks":
            return this.bundleTasks;
        case "offerings":
            return this.offerings;
        case "reservedInstances":
            return this.reservedInstances;
        case "loadbalancer":
            return this.loadbalancer;
        case "InstanceHealth":
            return this.InstanceHealth;
        case "subnets":
            return this.subnets;
        case "vpcs":
            return this.vpcs;
        case "dhcpOptions":
            return this.dhcpOptions;
        case "vpnConnections":
            return this.vpnConnections;
        case "vpnGateways":
            return this.vpnGateways;
        case "customerGateways":
            return this.customerGateways;
        case "internetGateways":
            return this.internetGateways;
        case "routeTables":
            return this.routeTables;
        case "networkAcls":
            return this.networkAcls;
        case "networkInterfaces":
            return this.networkInterfaces;
        case "s3buckets":
            return this.s3buckets;
        case "users":
            return this.users;
        }
        return []
    },

    refreshModel : function(name)
    {
        switch (name) {
        case "volumes":
            ew_session.controller.describeVolumes();
            break;
        case "images":
            ew_session.controller.describeImages();
            break;
        case "snapshots":
            ew_session.controller.describeSnapshots();
            break;
        case "instances":
            ew_session.controller.describeInstances();
            break;
        case "keypairs":
            ew_session.controller.describeKeypairs();
            break;
        case "accesskeys":
            ew_session.controller.listAccessKeys();
            break;
        case "certs":
            ew_session.controller.listsigningCertificates();
            break;
        case "azones":
            ew_session.controller.describeAvailabilityZones();
            break;
        case "securitygroups":
            ew_session.controller.describeSecurityGroups();
            break;
        case "addresses":
            ew_session.controller.describeAddresses();
            break;
        case "bundleTasks":
            ew_session.controller.describeBundleTasks();
            break;
        case "offerings":
            ew_session.controller.describeLeaseOfferings();
            break;
        case "reservedInstances":
            ew_session.controller.describeReservedInstances();
            break;
        case "loadbalancer":
            ew_session.controller.describeLoadBalancers();
            break;
        case "InstanceHealth":
            ew_session.controller.describeInstanceHealth();
            break;
        case "subnets":
            ew_session.controller.describeSubnets();
            break;
        case "vpcs":
            ew_session.controller.describeVpcs();
            break;
        case "dhcpOptions":
            ew_session.controller.describedhcpOptions();
            break;
        case "vpnConnections":
            ew_session.controller.describeVpnConnections();
            break;
        case "vpnGateways":
            ew_session.controller.describeVpnGateways();
            break;
        case "customerGateways":
            ew_session.controller.describeCustomerGateways();
            break;
        case "internetGateways":
            ew_session.controller.describeInternetGateways();
            break;
        case "routeTables":
            ew_session.controller.describeRouteTables();
            break;
        case "networkAcls":
            ew_session.controller.describeNetworkAcls();
            break;
        case "networkInterfaces":
            ew_session.controller.describeNetworkInterfaces();
            break;
        case "s3buckets":
            ew_session.controller.listS3Buckets();
            break;
        case "users":
            ew_session.controller.listUsers();
            break;
        }
        return []
    },

    notifyComponents : function(interest)
    {
        var comps = this.componentInterests[interest] || [];
        for ( var i in comps) {
            comps[i].notifyModelChanged(interest);
        }
    },

    registerInterest : function(component, interest)
    {
        if (!this.componentInterests[interest]) {
            this.componentInterests[interest] = [];
        }
        this.componentInterests[interest].push(component);
    },

    updateUsers : function(list)
    {
        this.users = list;
        this.notifyComponents("users");
    },

    getUsers : function()
    {
        if (this.users == null) {
            ew_session.controller.listUsers();
        }
        return this.users;
    },

    updateS3Buckets : function(list)
    {
        this.s3buckets = list;
        this.notifyComponents("s3buckets");
    },

    getS3Buckets : function()
    {
        if (this.s3buckets == null) {
            ew_session.controller.listS3Buckets();
        }
        return this.s3buckets;
    },

    getS3Bucket: function(bucket) {
        for (var i in this.getS3Buckets()) {
            if (bucket == this.s3buckets[i].name) {
                return this.s3buckets[i]
            }
        }
        return null;
    },

    getS3BucketKey: function(bucket, key) {
        for (var i in this.getS3Buckets()) {
            if (bucket == this.s3buckets[i].name) {
                for (var j in this.s3buckets[i].keys) {
                    if (this.s3buckets[i].keys[j].name == key) {
                        return this.s3buckets[i].keys[j]
                    }
                }
                break;
            }
        }
        return null;
    },

    updateNetworkInterfaces: function(list)
    {
        this.networkInterfaces = list;
        this.notifyComponents("networkInterfaces");
    },

    getNetworkInterfaces: function()
    {
        if (this.networkInterfaces == null) {
            ew_session.controller.describeNetworkInterfaces();
        }
        return this.networkInterfaces;
    },

    updateVpcs : function(list)
    {
        this.vpcs = list;
        this.notifyComponents("vpcs");
    },

    getVpcs : function()
    {
        if (this.vpcs == null) {
            ew_session.controller.describeVpcs();
        }
        return this.vpcs;
    },

    getVpcById: function(id)
    {
        for (var i in this.vpcs) {
            if (this.vpcs[i].id == id) {
                return this.vpcs[i]
            }
        }
        return null
    },

    updateSubnets : function(list)
    {
        this.subnets = list;
        this.notifyComponents("subnets");
    },

    getSubnets : function()
    {
        if (this.subnets == null) {
            ew_session.controller.describeSubnets();
        }
        return this.subnets;
    },

    getSubnetById: function(id)
    {
        for (var i in this.subnets) {
            if (this.subnets[i].id == id) {
                return this.subnets[i]
            }
        }
        return null
    },

    getSubnetsByVpcId: function(vpcId)
    {
        var rc = []
        for (var i in this.subnets) {
            if (this.subnets[i].vpcId == vpcId) {
                rc.push(this.subnets[i])
            }
        }
        return rc
    },

    updateDhcpOptions : function(list)
    {
        this.dhcpOptions = list;
        this.notifyComponents("dhcpOptions");
    },

    getDhcpOptions : function()
    {
        if (this.dhcpOptions == null) {
            ew_session.controller.describeDhcpOptions();
        }
        return this.dhcpOptions;
    },

    updateVpnConnections : function(list)
    {
        this.vpnConnections = list;
        this.notifyComponents("vpnConnections");
    },

    getVpnConnections : function()
    {
        if (this.vpnConnections == null) {
            ew_session.controller.describeVpnConnections();
        }
        return this.vpnConnections;
    },

    updateVpnGateways : function(list)
    {
        this.vpnGateways = list;
        this.notifyComponents("vpnGateways");
    },

    getVpnGateways : function()
    {
        if (this.vpnGateways == null) {
            ew_session.controller.describeVpnGateways();
        }
        return this.vpnGateways;
    },

    updateCustomerGateways : function(list)
    {
        this.customerGateways = list;
        this.notifyComponents("customerGateways");
    },

    getCustomerGateways : function()
    {
        if (this.customerGateways == null) {
            ew_session.controller.describeCustomerGateways();
        }
        return this.customerGateways;
    },

    updateInternetGateways : function(list)
    {
        this.internetGateways = list;
        this.notifyComponents("internetGateways");
    },

    getInternetGateways : function()
    {
        if (this.internetGateways == null) {
            ew_session.controller.describeInternetGateways();
        }
        return this.internetGateways;
    },

    updateRouteTables : function(list)
    {
        this.routeTables = list;
        this.notifyComponents("routeTables");
    },

    getRouteTables : function()
    {
        if (this.routeTables == null) {
            ew_session.controller.describeRouteTables();
        }
        return this.routeTables;
    },

    updateNetworkAcls : function(list)
    {
        this.networkAcls = list;
        this.notifyComponents("networkAcls");
    },

    getNetworkAcls : function()
    {
        if (this.networkAcls == null) {
            ew_session.controller.describeNetworkAcls();
        }
        return this.networkAcls;
    },

    getNetworkAclsByVpcId: function(vpcId)
    {
        var rc = []
        for (var i in this.networkAcls) {
            if (this.networkAcls[i].vpcId == vpcId) {
                rc.push(this.networkAcls[i])
            }
        }
        return rc
    },

    getVolumes : function()
    {
        if (this.volumes == null) {
            ew_session.controller.describeVolumes();
        }
        return this.volumes;
    },

    updateVolumes : function(list)
    {
        if (!this.instances) {
            ew_session.controller.describeInstances();
        }

        this.volumes = list;

        if (this.instances && list) {
            var instanceNames = new Object();

            for ( var i = 0; i < this.instances.length; i++) {
                var instance = this.instances[i];
                instanceNames[instance.id] = instance.name;
            }

            for ( var i = 0; i < list.length; i++) {
                var volume = list[i];
                volume.instanceName = instanceNames[volume.instanceId];
            }
        }

        this.notifyComponents("volumes");
    },

    updateSnapshots : function(list)
    {
        if (!this.images) {
            ew_session.controller.describeImages();
        }

        this.snapshots = list;

        if (this.images && list) {
            var amiNames = new Object();

            for ( var i = 0; i < this.images.length; i++) {
                var image = this.images[i];
                amiNames[image.id] = image.name;
            }

            for ( var i = 0; i < list.length; i++) {
                var snapshot = list[i];
                var snapshotAmiId = null;
                var m = null;

                if (snapshot.description && (m = snapshot.description.match(/\bami-\w+\b/))) {
                    snapshotAmiId = m[0];
                }

                if (snapshotAmiId) {
                    snapshot.amiId = snapshotAmiId;
                    snapshot.amiName = amiNames[snapshotAmiId];
                }
            }
        }

        this.notifyComponents("snapshots");
    },

    getSnapshots : function()
    {
        if (this.snapshots == null) {
            ew_session.controller.describeSnapshots();
        }
        return this.snapshots;
    },

    addToAmiManifestMap : function(ami, map)
    {
        if (!ami) return;
        if (!map) map = this.amiIdManifestMap;
        if (ami.id.match(regExs["ami"])) {
            map[ami.id] = ami.location;
        }
    },

    updateImages : function(list)
    {
        this.images = list;

        var amiMap = new Object();
        if (list) {
            // Rebuild the list that maps ami-id to ami-manifest
            for ( var i = 0; i < list.length; ++i) {
                var ami = list[i];
                this.addToAmiManifestMap(ami, amiMap);

                var manifest = ami.location;
                manifest = manifest.toLowerCase();
                if (ami.platform == "windows" && manifest.indexOf("winauth") >= 0) {
                    ami.platform += " authenticated";
                }
            }
        }
        this.amiIdManifestMap = amiMap;
        this.notifyComponents("images");
    },

    getImages : function()
    {
        if (this.images == null) {
            ew_session.controller.describeImages();
        }
        return this.images;
    },

    getAmiManifestForId : function(imageId)
    {
        if (imageId == null) return "";
        return this.amiIdManifestMap[imageId] || "";
    },

    updateInstances : function(list)
    {
        this.instances = list;
        if (list != null) {
            for ( var i = 0; i < list.length; ++i) {
                var instance = list[i];
                if (instance.platform == "windows") {
                    // Retrieve the ami manifest from the amiid
                    var manifest = this.amiIdManifestMap[instance.imageId] || "";
                    log("Manifest requested for: " + instance.imageId + ", received: " + manifest);
                    manifest = manifest.toLowerCase();
                    if (manifest.indexOf("winauth") >= 0) {
                        // This is an authenticated Windows instance
                        instance.platform += " authenticated";
                    }
                }
            }
        }
        this.notifyComponents("instances");
    },

    getInstances : function()
    {
        if (this.instances == null) {
            ew_session.controller.describeInstances();
        }
        return this.instances;
    },

    getInstanceById: function(id) {
        if (this.instances) {
            for (var i in this.instances) {
                if (this.instances[i].id == id) {
                    return this.instances[i];
                }
            }
        }
        return null;
    },

    updateKeypairs : function(list)
    {
        this.keypairs = list;
        this.notifyComponents("keypairs");
    },

    getKeypairs : function()
    {
        if (this.keypairs == null) {
            ew_session.controller.describeKeypairs();
        }
        return this.keypairs;
    },

    updateAccessKeys : function(list)
    {
        this.accesskeys = list;
        this.notifyComponents("accesskeys");
    },

    getAccessKeys : function()
    {
        if (this.accesskeys == null) {
            ew_session.controller.listAccessKeys();
        }
        return this.accesskeys;
    },

    updateCerts : function(list)
    {
        this.certs = list;
        this.notifyComponents("certs");
    },

    getCerts : function()
    {
        if (this.certs == null) {
            ew_session.controller.listSigningCertificates();
        }
        return this.certs;
    },

    updateSecurityGroups : function(list)
    {
        this.securityGroups = list;
        this.notifyComponents("securitygroups");
    },

    getSecurityGroups : function()
    {
        if (this.securityGroups == null) {
            ew_session.controller.describeSecurityGroups();
        }
        return this.securityGroups;
    },

    getAddresses : function()
    {
        if (this.addresses == null) {
            ew_session.controller.describeAddresses();
        }
        return this.addresses;
    },

    updateAddresses : function(list)
    {
        if (!this.instances) {
            ew_session.controller.describeInstances();
        }

        this.addresses = list;

        if (this.instances && list) {
            var instanceNames = new Object();
            var instancePublicDnsNames = new Object();

            for ( var i = 0; i < this.instances.length; i++) {
                var instance = this.instances[i];
                instanceNames[instance.id] = instance.name;
                instancePublicDnsNames[instance.id] = instance.publicDnsName;
            }

            for ( var i = 0; i < list.length; i++) {
                var address = list[i];
                address.instanceName = instanceNames[address.instanceid];
                address.instancePublicDnsName = instancePublicDnsNames[address.instanceid];
            }
        }

        this.notifyComponents("addresses");
    },

    updateAvailabilityZones : function(list)
    {
        this.azones = list;
        this.notifyComponents("azones");
    },

    getAvailabilityZones : function()
    {
        if (this.azones == null) {
            ew_session.controller.describeAvailabilityZones();
        }
        return this.azones;
    },

    updateBundleTasks : function(list)
    {
        this.bundleTasks = list;
        this.notifyComponents("bundleTasks");
    },

    getBundleTasks : function()
    {
        if (this.bundleTasks == null) {
            ew_session.controller.describeBundleTasks();
        }
        return this.bundleTasks;
    },

    updateLeaseOfferings : function(list)
    {
        this.offerings = list;
        this.notifyComponents("offerings");
    },

    getLeaseOfferings : function()
    {
        if (this.offerings == null) {
            ew_session.controller.describeLeaseOfferings();
        }
        return this.offerings;
    },

    updateReservedInstances : function(list)
    {
        this.reservedInstances = list;
        this.notifyComponents("reservedInstances");
    },

    getReservedInstances : function()
    {
        if (this.reservedInstances == null) {
            ew_session.controller.describeReservedInstances();
        }
        return this.reservedInstances;
    },

    updateLoadbalancer : function(list)
    {
        this.loadbalancer = list;
        this.notifyComponents("loadbalancer");
    },

    getLoadbalancer : function()
    {
        if (this.loadbalancer == null) {
            ew_session.controller.describeLoadBalancers();
        }
        return this.loadbalancer;
    },

    updateInstanceHealth : function(list)
    {
        if (!this.instances) {
            ew_session.controller.describeInstances();
        }

        this.InstanceHealth = list;

        if (this.instances && list) {
            var instanceNames = new Object();

            for ( var i = 0; i < this.instances.length; i++) {
                var instance = this.instances[i];
                instanceNames[instance.id] = instance.name;
            }

            for ( var i = 0; i < list.length; i++) {
                var instanceHealth = list[i];
                instanceHealth.InstanceName = instanceNames[instanceHealth.InstanceId];
            }
        }

        this.notifyComponents("InstanceHealth");
    },

    getInstanceHealth : function()
    {
        if (this.InstanceHealth == null) {
            ew_session.controller.describeInstanceHealth();
        }
        return this.InstanceHealth;
    }
}
