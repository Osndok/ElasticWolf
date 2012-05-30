var ew_InstanceConsole = {
    init : function() {
        document.getElementById("ew.console.instanceid").value = window.arguments[0];
        document.getElementById("ew.console.timestamp").value = window.arguments[1];

        var output = "<no output available>";
        if (window.arguments[2] != null) {
            output = window.arguments[2];
        }
        document.getElementById("ew.console.output").value = output;
    }
}
