var ew_CreateImageDialog = {
    id : null,
    ew_session : null,
    retVal : null,

    getAmiName : function() {
        return document.getElementById("ew.createImage.amiName");
    },

    getAmiDescription : function() {
        return document.getElementById("ew.createImage.amiDescription");
    },

    getNoReboot : function() {
        return document.getElementById("ew.createImage.noReboot");
    },

    createImage : function() {
        this.retVal.amiName = this.getAmiName().value;
        this.retVal.amiDescription = this.getAmiDescription().value;

        var regex = new RegExp("^[ .0-9a-zA-Z\_\(\)\,\/\-]{3,128}$");
        if (!this.retVal.amiName.match(regex)) {
            alert ("The AMI Name is not formatted properly; it must be 3-128 characters "+
                   "in length containing alphanumerics, parantheses, spaces, commas, slashes, dashes, and underscores.");
            return false;
        }

        if (this.getNoReboot().checked) {
            this.retVal.noReboot = true;
        } else {
            this.retVal.noReboot = false;
        }

        this.retVal.ok = true;
        return true;
    },

    init : function() {
        this.id = window.arguments[0];
        this.ew_session = window.arguments[1];
        this.retVal = window.arguments[2];

        document.getElementById("ew.createImage.instanceid").value = this.id;
        this.getAmiName().select();
    }
}
