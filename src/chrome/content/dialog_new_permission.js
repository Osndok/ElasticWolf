var ew_Authorizer = {
  group : null,
  unusedSecGroupsList : null,
  usedSecGroupsList : null,
  unused : new Array(),
  used : new Array(),
  ew_session : null,
  retval : null,

  authorize : function() {
    // Get the group's name
    var newPerm = new Object();

    // Need to get the IP etc.
    var radioSel = document.getElementById("ew.newpermission.hostnet.group").selectedItem.value;

    switch (radioSel) {
    case "host":
        var textbox = document.getElementById("ew.newpermission.source.host");
        if (textbox.value == "") {
          alert("Please provide a source host");
          textbox.select();
          return false;
        }
        var cidrStr = textbox.value.trim();
        if (cidrStr.indexOf('/') == -1) {
          cidrStr += "/32";
        }
        if (!this.validateCIDR(cidrStr, textbox)) {
            return false;
        }
        break;

    case "range":
        var textbox = document.getElementById("ew.newpermission.source.range");
        if (textbox.value == "") {
          alert("Please provide a source host range");
          textbox.select();
          return false;
        }
        var cidrStr = textbox.value.trim();
        if (!this.validateCIDR(cidrStr, textbox)) {
            return false;
        }
        break;

    case "group":
        var group = document.getElementById("ew.newpermission.source.group");
        var user = document.getElementById("ew.newpermission.source.user");
        if (!user.value || !group.value) {
          alert("Please provide a source group / user");
          return false;
        }
        newPerm.srcGroup = { id: group.value, name: group.selectedItem.label.split("/")[1], ownerId: user.value };
    }

    newPerm.cidrIp = cidrStr;
    var protocol = document.getElementById("ew.newpermission.protocol").value;
    if (protocol == "other") {
        protocol = document.getElementById("ew.newpermission.other").value;
        if (protocol == "tcp" || protocol == "udp") {
          // UDP/TCP
          var fromTextBox = document.getElementById("ew.newpermission.fromport");
          var toTextBox   = document.getElementById("ew.newpermission.toport");
          if (!this.validateMinPort(fromTextBox)) {
            return false;
          }
          newPerm.fromPort = fromTextBox.value.trim();

          if (!this.validateMaxPort(toTextBox, fromTextBox)) {
            return false;
          }
          newPerm.toPort = toTextBox.value.trim();
        } else
        if (protocol == "icmp") {
          // icmp
          newPerm.fromPort = document.getElementById("ew.newpermission.icmptype").value.trim();
          newPerm.toPort = document.getElementById("ew.newpermission.icmpcode").value.trim();
        }
    } else {
        newPerm.toPort = document.getElementById("ew.newpermission.knownport").value.trim();
        newPerm.fromPort = document.getElementById("ew.newpermission.knownport").value.trim();
        protocol = document.getElementById("ew.newpermission.protocol.menuitem").value;
    }

    newPerm.ipProtocol = protocol;
    if (newPerm.fromPort == "0" && newPerm.toPort == "65535" && newPerm.cidrIp == "0.0.0.0/0") {
        var fOpen = confirm("This will effectively disable your firewall and open all ports to the world. Continue?");

        // If the user chooses to change these settings,
        // bring the dialog back in focus.
        if (!fOpen) {
            document.getElementById("ew.newpermission.toport").select();
            return false;
        }
    }

    this.retVal.ok = true;
    this.retVal.newPerm = newPerm;
    return true;
  },

  validateMinPort : function(minTextBox) {
    var val = parseInt(minTextBox.value);
    if (val < 0 || isNaN(val)) {
      alert("Lower port range bound must be a non-negative integer");
      textbox.select();
      return false;
    }
    return true;
  },

  validateMaxPort : function(maxTextBox, minTextBox) {
    maxval = parseInt(maxTextBox.value);
    if (maxval < 0 || isNaN(maxval)) {
      alert("Upper port range bound must be a non-negative integer");
      maxTexBbox.select();
      return false;
    }
    var minval = parseInt(minTextBox.value);
    if (minval > maxval) {
      alert("Upper port range bound may not be smaller than lower bound");
      alert("Maximum value may not be smaller than minimum value");
      maxTextBox.select();
      return false;
    }
    return true;
  },

  validateCIDR : function(cidrStr, textbox) {
    var cidrre = new RegExp("^\\d+\\.\\d+\\.\\d+\\.\\d+\\/\\d+$");
    if (cidrStr.match(cidrre) == null) {
      alert("Malformed CIDR, expecting n.n.n.n/n or n.n.n.n");
      textbox.select();
      return false;
    }
    return true;
  },

  validateSourceUserGroup : function() {
    var user = document.getElementById("ew.newpermission.source.user");
    if (user.value == "") {
      alert("Please provide a source user ID");
      user.select();
      return false;
    }
    var group = document.getElementById("ew.newpermission.source.group");
    if (group.value == "") {
      alert("Please provide a source security group name");
      group.select();
      return false;
    }
    return true;
  },

  displayProtocolDetails : function(fDisplay) {
    if (fDisplay) {
      ew_Authorizer.selectProtocolDataDeck(1);
      ew_Authorizer.selectProtocolDeck(1);
    } else {
      this.selectProtocolDataDeck(0);
      this.selectProtocolDeck(0);
      var protocol = document.getElementById("ew.newpermission.protocol").value;
      document.getElementById("ew.newpermission.knownport").value = protPortMap[protocol];
    }
  },

  getHostAddress : function() {
    var retVal = {ipAddress:"0.0.0.0"};
    this.ew_session.client.queryCheckIP("", retVal);
    var hostIP = document.getElementById("ew.newpermission.source.host");
    hostIP.value = retVal.ipAddress.replace(/\s/g,'') + "/32";
    document.getElementById("ew.newpermission.hostnet.group").selectedIndex = 0;
  },

  getHostNetwork : function() {
    var retVal = {ipAddress:"0.0.0.0"};
    this.ew_session.client.queryCheckIP("block", retVal);
    var hostSubnet = document.getElementById("ew.newpermission.source.range");
    hostSubnet.value = retVal.ipAddress.replace(/\s/g,'');
    document.getElementById("ew.newpermission.hostnet.group").selectedIndex = 1;
  },

  selectProtocolDeck : function(index) {
    var deck = document.getElementById("ew.newpermission.deck.protocol");
    deck.selectedIndex = index;
  },

  selectProtocolDataDeck : function(index) {
    var deck = document.getElementById("ew.newpermission.deck.protocol.data");
    deck.selectedIndex = index;
  },

  init : function() {
    this.group = window.arguments[0];
    this.ew_session = window.arguments[1];
    this.retVal = window.arguments[2];

    if (this.group == null) {
        return true;
    }
    var permCaption = document.getElementById("ew.newpermission.add.caption");
    permCaption.label = "Add New " + this.retVal.type + " Permission for Security Group: " + this.group.name;

    var user = document.getElementById("ew.newpermission.source.user");
    user.value = this.group.ownerId;
    var securityGroups = this.ew_session.model.getSecurityGroups();
    var groupMenu = document.getElementById("ew.newpermission.source.group");
    groupMenu.appendItem("", "");
    for(var i in securityGroups) {
        if ((this.group.vpcId != "" && securityGroups[i].vpcId == "") || (this.group.vpcId == "" && securityGroups[i].vpcId != "")) {
            continue;
        }
        groupMenu.appendItem(securityGroups[i].id + "/" + securityGroups[i].name, securityGroups[i].id);
        if (this.group.id == securityGroups[i].id) {
            groupMenu.selectedIndex = i;
        }
    }

    // Initialize the Protocol Port for the selected protocol.
    var protocol = document.getElementById("ew.newpermission.protocol").value;
    document.getElementById("ew.newpermission.knownport").value = protPortMap[protocol];
  }
};

