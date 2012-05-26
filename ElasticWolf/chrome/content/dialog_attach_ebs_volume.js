var ew_EBSVolumeAttacher = {
    ew_session : null,
    retVal : null,
    instanceId : null,
    volList : null,

    attach : function() {
        if (!this.validateDevice()) return false;

        this.retVal.device = document.getElementById("ew.attachebsvolume.device").value;
        var idxSel = document.getElementById("ew.attachebsvolume.volumeId").selectedIndex;
        this.retVal.volumeId = this.volList[idxSel].id;
        this.retVal.ok = true;

        return true;
    },

    validateDevice: function() {
        var textbox = document.getElementById("ew.attachebsvolume.device");
        if (textbox.value == "") {
            alert("You must enter a device name (e.g. /dev/sdh)");
            textbox.select();
            return false;
        }
        return true;
    },

    init : function() {
        this.ew_session = window.arguments[0];
        var instance = window.arguments[1];
        this.instanceId = instance.id;
        var zone = instance.placement.availabilityZone;
        this.retVal = window.arguments[2];
        this.volList = new Array();

        // instance
        document.getElementById("ew.attachebsvolume.instanceId").value = this.instanceId;

        // device
        var textbox = document.getElementById("ew.attachebsvolume.device");
        if (isWindows(window.arguments[1].platform)) {
            textbox.disabled = true;
            textbox.value = "windows_device";
        } else {
            textbox.disabled = false;
            textbox.value = "";
        }

        // volume ids
        var volMenu = document.getElementById("ew.attachebsvolume.volumeId");
        var volumes = this.ew_session.model.getVolumes();
        var vol = null;
        var label = null;
        var name = null;
        for(var i in volumes) {
            vol = volumes[i];
            // A volume can be attached to this instance only if:
            // 1. It is in the same zone as this instance
            // 2. It is not attached to another instance
            if (zone == vol.availabilityZone &&
                vol.instanceId.length == 0) {
                this.volList.push(vol);
                label = vol.id;
                name = __tagToName__(vol.tag);

                if (name && name.length) {
                    label = label + ":" + name;
                }
                volMenu.appendItem(label);
            }
        }
        volMenu.selectedIndex = 0;

        var az = document.getElementById("ew.attachebsvolume.instanceLabel");
        az.value += " [" + zone + "]";
    }
}
