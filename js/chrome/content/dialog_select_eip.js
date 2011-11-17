var ec2_EIPSelector = {
  ec2ui_session : null,
  instanceId : null,
  instance: null,
  retVal : null,
  eipList : null,

  attach : function() {
    var eipMenu = document.getElementById("ec2ui.selectEIP.eip");
    var selected = eipMenu.selectedIndex;
    var eipSel = this.eipList[selected];

    if (eipSel.instanceid != null && eipSel.instanceid != '') {
        var confirmed = confirm("Address " + eipSel.address + " is already mapped to an instance, are you sure?");
        if (!confirmed) {
            return false;
        }
    }
    eipSel.instanceid = this.instance.id;
    this.retVal.eipMap = eipSel;
    this.retVal.ok = true;
    return true;
  },

  init : function() {
    this.ec2ui_session = window.arguments[0];
    this.instance = window.arguments[1];
    this.retVal = window.arguments[2];

    var eips = this.ec2ui_session.model.getAddresses();
    this.eipList = new Array();

    // volume id
    document.getElementById("ec2ui.selectEIP.instanceId").value = this.instance.id;
    // instances
    var eipMenu = document.getElementById("ec2ui.selectEIP.eip");
    for(var i in eips) {
        var eip = eips[i];
        if ((isVpc(this.instance) && eip.domain != "vpc") || (!isVpc(this.instance) && eip.domain == "vpc")) {
            continue
        }
        if (!eip.instanceid) {
            eipMenu.appendItem(eip.address + (eip.tag ? ": " + eip.tag : ""));
            this.eipList.push(eip);
        }
    }

    eipMenu.selectedIndex = 0;
  },
}
