var ec2ui_client = {
    handler : null,
    uri     : null,
    auxObj  : null,
    serviceURL : null,
    regions : null,
    elbURL  : null,
    accessCode : null,
    secretKey : null,
    errorCount: 0,
    timers : {},

    NAME: 'ElasticWolf',
    VERSION: '1.16',
    API_VERSION : '2011-07-15',
    OLD_API_VERSION: '2010-11-15',
    ELB_API_VERSION : '2011-04-05',
    IAM_API_VERSION : '2010-05-08',
    APP_SITE: 'https://github.com',
    APP_PATH: '/vseryakov/',
    VPN_CONFIG_PATH : 'http://ec2-downloads.s3.amazonaws.com/',
    SIG_VERSION: '2',
    IAM_GOV_URL: 'https://iam.us-gov.amazonaws.com',
    IAM_URL : 'https://iam.amazonaws.com',
    REALM : 'chrome://ec2ui/',
    HOST  : 'chrome://ec2ui/',

    getAppName : function() {
        return this.NAME;
    },

    getAppUrl: function() {
        return this.APP_SITE + this.APP_PATH + this.NAME
    },

    getDownloadUrl: function() {
        return this.getAppUrl() + "/downloads/"
    },

    getUserAgent: function () {
        return this.getAppName() + "/" + this.VERSION;
    },

    getIAMURL: function() {
        return this.isGovCloud() ? this.IAM_GOV_URL : this.IAM_URL;
    },

    isGovCloud : function()
    {
        return this.serviceURL.indexOf("ec2.us-gov") > -1;
    },

    checkForUpdates: function() {
        ver = parseFloat(this.VERSION) + 0.01
        var url = this.getDownloadUrl()
        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return;
        }
        debug(url)
        xmlhttp.open("GET", url, false);
        xmlhttp.setRequestHeader("User-Agent", this.getUserAgent());
        try { xmlhttp.send(null); }
        catch(e) { debug(JSON.stringify(e)) }
        var data = xmlhttp.responseText;
        var d = data.match(new RegExp("\/downloads\/[^\/]+\/" + this.NAME + "\/" + this.NAME + (isWindows(navigator.platform) ? "-win-" : "-osx-") + "([0-9]\.[0-9][0-9])\.zip"))
        if (d != null) {
            debug(d);
            if (parseFloat(d[1]) > parseFloat(this.VERSION)) {
                alert("New version " + d[1] + "is available at " + this.APP_SITE + d[0])
                return;
            }
        }
        alert("No new version available")
    },

    getNsResolver : function() {
        var client = this;
        return function(prefix) {
            var ns = {
            's':  "http://schemas.xmlsoap.org/soap/envelope/",  // SOAP namespace
            'ec2': "http://ec2.amazonaws.com/doc/"+client.API_VERSION+"/"   // EC2 namespace, must match request version
            };
            return ns[prefix] || null;
        }
    },

    setCredentials : function (accessCode, secretKey) {
        this.accessCode = accessCode;
        this.secretKey = secretKey;
    },

    setEndpoint : function (endpoint) {
        if (endpoint != null) {
            this.serviceURL = endpoint.url;
            this.regions = endpoint.name;
            this.elbURL = "https://elasticloadbalancing."+this.regions+".amazonaws.com";
        }
    },

    newInstance : function() {
        var xmlhttp;
        if (typeof XMLHttpRequest != 'undefined') {
            try {
                xmlhttp = new XMLHttpRequest();
            } catch (e) {
                xmlhttp = null;
            }
        }
        return xmlhttp;
    },

    sigParamCmp : function(x, y) {
        if (x[0].toLowerCase() < y[0].toLowerCase ()) {
            return -1;
        }
        if (x[0].toLowerCase() > y[0].toLowerCase()) {
           return 1;
        }
        return 0;
    },

    setEndpointURLForRegion : function(region) {
        var reg = ec2ui_utils.determineRegionFromString(ec2ui_session.getActiveEndpoint().name);
        log(reg + ": active region prefix");
        if (reg != region) {
            var newURL = null;
            // Determine the region's EC2 URL
            var endpointlist = ec2ui_session.getEndpoints();
            region = region.toLowerCase();
            for (var i = 0; i < endpointlist.length; ++i) {
                var curr = endpointlist[i];
                if (curr.name.indexOf(region) >= 0) {
                    newURL = curr.url;
                    break;
                }
            }

            log(newURL + ": new URL");
            if (newURL == null) {
                return;
            }

            // Switch to the new URL
            this.serviceURL = newURL;
        }
    },

    queryEC2InRegion : function (region, action, params, objActions, isSync, reqType, callback) {
        // Save the current Service URL
        var oldURL = this.serviceURL;
        log(oldURL + ": old URL");
        this.setEndpointURLForRegion(region);

        // Make the call
        var toRet = this.queryEC2(action, params, objActions, isSync, reqType, callback);

        // Switch back to the old URL
        this.serviceURL = oldURL;
        return toRet;
    },

    queryEC2 : function (action, params, objActions, isSync, reqType, callback, apiURL, apiVersion, sigVersion) {
        if (this.accessCode == null || this.accessCode == "") {
            log ("No Access Code for user");
            return;
        }

        if (this.serviceURL == null || this.serviceURL == "") {
            this.setEndpoint(ec2ui_session.getActiveEndpoint());
        }

        var rsp = null;
        while(true) {
            try {
                rsp = this.queryEC2Impl(action, params, objActions, isSync, reqType, callback, apiURL, apiVersion, sigVersion);
                if (rsp.hasErrors) {
                    // Prevent from showing error dialog on every error until success, this happens in case of wrong credentials or endpoint and until all views not refreshed
                    this.errorCount++;
                    if (this.errorCount < 5) {
                        if (!this.errorDialog("EC2 responded with an error for "+action, rsp.faultCode, rsp.requestId,  rsp.faultString)) {
                            break;
                        }
                        this.errorCount = 0;
                    } else {
                        break;
                    }
                } else {
                    this.errorCount = 0;
                    break;
                }
            } catch (e) {
                alert ("An error occurred while calling "+action+"\n"+e);
                rsp = null;
                break;
            }
        }
        return rsp;
    },

    errorDialog : function(msg, code, rId, fStr) {
        var retry = {value:null};
        window.openDialog("chrome://ec2ui/content/dialog_retry_cancel.xul", null, "chrome,modal,resizable", msg, code, rId, fStr, retry);
        return retry.value;
    },

    sigParamCmp : function(x, y) {
        if (x[0].toLowerCase() < y[0].toLowerCase ()) {
            return -1;
        }
        if (x[0].toLowerCase() > y[0].toLowerCase()) {
           return 1;
        }
        return 0;
    },

    queryEC2Impl : function (action, params, objActions, isSync, reqType, callback, apiURL, apiVersion, sigVersion) {
        var curTime = new Date();
        var formattedTime = formatDate(curTime, "yyyy-MM-ddThh:mm:ssZ");

        var url = apiURL ? apiURL : this.serviceURL
        var sigValues = new Array();
        sigValues.push(new Array("Action", action));
        sigValues.push(new Array("AWSAccessKeyId", this.accessCode));
        sigValues.push(new Array("SignatureVersion", sigVersion ? sigVersion : this.SIG_VERSION));
        sigValues.push(new Array("SignatureMethod", "HmacSHA1"));
        sigValues.push(new Array("Version", apiVersion ? apiVersion : this.API_VERSION));
        sigValues.push(new Array("Timestamp", formattedTime));

        // Mix in the additional parameters. params must be an Array of tuples as for sigValues above
        for (var i = 0; i < params.length; i++) {
            sigValues.push(params[i]);
        }

        var strSig = "";
        var queryParams = "";

        if (this.sigVersion == "1") {
            sigValues.sort(this.sigParamCmp);
            for (var i = 0; i < sigValues.length; i++) {
                strSig += sigValues[i][0] + sigValues[i][1];
                queryParams += (i ? "&" : "") + sigValues[i][0] + "=" + encodeURIComponent(sigValues[i][1]);
            }
        }  else {
            sigValues.sort();
            strSig = "POST\n" + url.replace(/https?:\/\//,"") + "\n/\n";
            for (var i = 0; i < sigValues.length; i++) {
                var item = (i ? "&" : "") + sigValues[i][0] + "=" + encodeURIComponent(sigValues[i][1]);
                strSig += item
                queryParams += item
            }
        }
        queryParams += "&Signature="+encodeURIComponent(b64_hmac_sha1(this.secretKey, strSig));
        url += "/";

        log("URL ["+url+"?"+queryParams+"]");

        var timerKey = strSig+":"+formattedTime;

        if (!ec2ui_prefs.isOfflineEnabled()) {
            var xmlhttp = this.newInstance();
            if (!xmlhttp) {
                log("Could not create xmlhttp object");
                return null;
            }
            xmlhttp.open("POST", url, !isSync);
            xmlhttp.setRequestHeader("User-Agent", this.getUserAgent());
            xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xmlhttp.setRequestHeader("Content-Length", queryParams.length);
            xmlhttp.setRequestHeader("Connection", "close");
            this.startTimer(timerKey, 30000, xmlhttp.abort);
            var me = this;
            if (isSync) {
                xmlhttp.onreadystatechange = empty;
            } else {
                xmlhttp.onreadystatechange = function () {
                    me.handleAsyncResponse(xmlhttp, callback, reqType, objActions);
                }
            }

            try {
                xmlhttp.send(queryParams);
                this.stopTimer(timerKey);
            } catch(e) {
                if (isSync && !this.stopTimer(timerKey)) {
                    // A timer didn't exist, this is unexpected
                    throw e;
                }
                var faultStr = "Please check your EC2 URL '" + url + "' for correctness, or delete the value in ec2ui.endpoints using about:config and retry.";
                return this.newResponseObject(null, callback, reqType, true, "Request Error", faultStr, "");
            }
        }

        return this.processXMLHTTPResponse(xmlhttp, reqType, isSync, timerKey, objActions, callback);
    },

    queryELB : function (action, params, objActions, isSync, reqType, callback) {
        if (this.elbURL == null || this.elbURL == "") {
            this.setEndpoint(ec2ui_session.getActiveEndpoint());
        }
        return this.queryEC2(action, params, objActions, isSync, reqType, callback, this.elbURL, this.ELB_API_VERSION);
    },

    queryIAM : function (action, params, objActions, isSync, reqType, callback) {
        return this.queryEC2(action, params, objActions, isSync, reqType, callback, this.getIAMURL(), this.IAM_API_VERSION);
    },

    generateS3StringToSign : function(requestType, content, copySource, curTime, fileName) {
        var sigValues = new Array();
        sigValues.push(new Array("Request-Type", requestType));
        sigValues.push(new Array("Content-MD5", ""));

        var contType = "binary/octet-stream";
        if (content &&
            content.length > 0 &&
            ("@mozilla.org/login-manager;1" in Components.classes)) {
            // This is firefox 3+, so an automatic content-encoding is added
            contType = contType + "; charset=UTF-8";
        }

        sigValues.push(new Array("Content-Type", contType));
        sigValues.push(new Array("Date", curTime));

        if (copySource) {
            sigValues.push(new Array("Amazon-S3-Extension", "x-amz-copy-source:" + encodeURIComponent(copySource)));
            sigValues.push(new Array("Amazon-S3-Extension", "x-amz-metadata-directive:COPY"));
        }
        sigValues.push(new Array("path", fileName));

        // Construct the string to sign and query string
        var strSig = "";
        for (var i = 0; i < (sigValues.length - 1); ++i) {
            strSig += sigValues[i][1] + "\n";
        }

        // Append the last part of the request that needs to be signed.
        strSig += sigValues[i][1];
        log("StrSig ["+strSig+"]");

        return strSig;
    },

    S3SignString : function(strSig) {
        var sig = "AWS " + this.accessCode + ":" + b64_hmac_sha1(this.secretKey, strSig);
        log("Auth Str["+sig+"]");

        return sig;
    },

    handleAsyncResponse : function(xmlhttp, callback, reqType, objActions) {
        if (xmlhttp.readyState == 4) {
            var responseObject = null;
            log("Async Response = " + xmlhttp.status + ", response: " + xmlhttp.responseText);
            if (xmlhttp.status >= 200 && xmlhttp.status < 300) {
                responseObject = this.newResponseObject(xmlhttp, callback, reqType, false);
            } else {
                log("Generating ASync Failure Response");
                responseObject = this.unpackXMLErrorRsp(xmlhttp, reqType, callback);
            }
            responseObject.isAsync = true;
            objActions.onResponseComplete(responseObject);
            return responseObject;
        }
    },

    makeS3HTTPRequest : function(requestType, fileName, url, content, xmlhttp, copySource, isAsync, reqType, objActions, callback) {
        var curTime = new Date().toUTCString();

        // isAsync might be undefined. This forces a true/false
        // value to be associated with fAsync
        var fAsync = (isAsync == true);

        if (requestType != "GET" &&
            requestType != "PUT" &&
            requestType != "DELETE" &&
            requestType != "HEAD") {
            return null;
        }

        if (!content) {
            content = null;
        }

        // Generate String to Sign
        var strSig = this.generateS3StringToSign(requestType, content, copySource, curTime, fileName);

        // Sign the string
        var sig = this.S3SignString(strSig);

        if (!xmlhttp) {
            xmlhttp = this.newInstance();
        }

        // Ensure that the URL is encoded correctly and that an attack isn't
        // launched against S3 via the bucket name or key
        // This breaks the XMLHTTPRequest.Open call.
        // url = encodeURIComponent(url);

        var me = this;
        xmlhttp.open(requestType, url, fAsync);

        // In the future, the onreadystatechange event will be
        // triggered for synchronous requests in Firefox as well.
        if (fAsync) {
            xmlhttp.onreadystatechange = function () {
                me.handleAsyncResponse(xmlhttp, callback, reqType, objActions);
            }
        } else {
            xmlhttp.onreadystatechange = empty;
        }

        xmlhttp.setRequestHeader("Content-Type", "binary/octet-stream");
        xmlhttp.setRequestHeader("Content-MD5", "");
        xmlhttp.setRequestHeader("Date", curTime);
        xmlhttp.setRequestHeader("Authorization", sig);
        if (content && content.length) {
            xmlhttp.setRequestHeader("Content-Length", content.length);
            log ("Content-Length: " + content.length);
        } else {
            xmlhttp.setRequestHeader("Content-Length", 0);
        }

        if (copySource) {
            xmlhttp.setRequestHeader("x-amz-copy-source", encodeURIComponent(copySource));
            xmlhttp.setRequestHeader("x-amz-metadata-directive", "COPY");
        }
        xmlhttp.setRequestHeader("User-Agent", this.getUserAgent());

        var timerKey = new Date().getTime();
        this.startTimer(timerKey, 30 * 1000, xmlhttp.abort);
        try {
            log("Content: " + content);
            xmlhttp.send(content);
            this.stopTimer(timerKey);
        } catch(e) {
            if (!fAsync && !this.stopTimer(timerKey)) {
                // A timer didn't exist, this is unexpected
                throw e;
            }

            var faultStr = "Your request timed out. Please try again later.";
            return this.newResponseObject(null, callback, reqType, true, "Timeout", faultStr, "");
        }

        // Process the response
        return this.processXMLHTTPResponse(xmlhttp, reqType, !fAsync, timerKey, objActions, callback);
    },

    newResponseObject : function(xmlhttp, callback, reqType, hasErrors, faultCode, faultString, requestId) {
        var xmlDoc = (xmlhttp) ? xmlhttp.responseXML : null;
        var strHeaders = (xmlhttp) ? xmlhttp.getAllResponseHeaders() : null;

        return {
            xmlhttp : xmlhttp,
            xmlDoc: xmlDoc,
            strHeaders: strHeaders,
            callback: callback,
            requestType : reqType,
            faultCode : faultCode,
            requestId : requestId,
            faultString : faultString,
            hasErrors : hasErrors,
        };
    },

    processXMLHTTPResponse : function(xmlhttp, reqType, isSync, timerKey, objActions, callback) {
        if (isSync) {
            log("Sync Response = " + xmlhttp.status + "("+xmlhttp.readyState+"): " + xmlhttp.responseText);

            if (xmlhttp.status >= 200 && xmlhttp.status < 300) {
                log("Generating Sync Success Response");
                var resp = this.newResponseObject(xmlhttp, callback, reqType, false);
                if (objActions) {
                    objActions.onResponseComplete(resp);
                }
                return resp;
            } else {
                log("Generating Sync Failure Response");
                return this.unpackXMLErrorRsp(xmlhttp, reqType, callback);
            }
        } else {
            return {hasErrors:false};
        }
    },

    unpackXMLErrorRsp : function(xmlhttp, reqType, callback) {
        var faultCode = "Unknown";
        var faultString = "An unknown error occurred.";
        var requestId = "";
        var xmlDoc = xmlhttp.responseXML;

        if (!xmlDoc) {
            if (xmlhttp.responseText)
            xmlDoc = new DOMParser().parseFromString(xmlhttp.responseText, "text/xml");
        }

        if (xmlDoc) {
            faultCode = getNodeValueByName(xmlDoc, "Code");
            faultString = getNodeValueByName(xmlDoc, "Message");
            requestId = getNodeValueByName(xmlDoc, "RequestID");
        }

        log("Generated New Error Response Object");
        return this.newResponseObject(xmlhttp, callback, reqType, true, faultCode, faultString, requestId);
    },

    queryVpnConnectionStylesheets : function(stylesheet) {
        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return;
        }

        if (stylesheet == null) {
            stylesheet = "customer-gateway-config-formats.xml";
        }

        var url = this.VPN_CONFIG_PATH + '2009-07-15' + "/" + stylesheet
        log ("Retrieving: "+url);

        xmlhttp.open("GET", url, false);
        xmlhttp.onreadystatechange = empty;
        xmlhttp.setRequestHeader("User-Agent", this.getUserAgent());
        xmlhttp.overrideMimeType('text/xml');

        var timerKey = new Date().getTime();
        // We'll wait up to 10 seconds for a response
        this.startTimer(timerKey, 10 * 1000, xmlhttp.abort);
        try {
            xmlhttp.send(null);
            this.stopTimer(timerKey);
        } catch(e) {
            if (!this.stopTimer(timerKey)) {
                // A timer didn't exist, this is unexpected
                throw e;
            }
        }

        log("XMLHTTP is in state: "+xmlhttp.readyState);

        return this.processXMLHTTPResponse(xmlhttp, stylesheet, true, timerKey, null, null);
    },

    queryCheckIP : function(reqType, retVal) {
        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return;
        }
        xmlhttp.open("GET", "http://checkip.amazonaws.com/" + reqType, false);
        xmlhttp.setRequestHeader("User-Agent", this.getUserAgent());

        var timerKey = new Date().getTime();
        this.startTimer(timerKey, 10000, xmlhttp.abort);
        try {
            xmlhttp.send(null);
            this.stopTimer(timerKey);
        } catch(e) {
            if (!this.stopTimer(timerKey)) {
                // A timer didn't exist, this is unexpected
                throw e;
            }
        }

        retVal.ipAddress = xmlhttp.responseText;
    },

    startTimer : function(key, timeout, expr) {
        var timer = window.setTimeout(expr, timeout);
        this.timers[key] = timer;
    },

    stopTimer : function(key, timeout) {
        var timer = this.timers[key];
        this.timers[key] = null;
        if (timer == null) {
            return false;
        }
        window.clearTimeout(timer);
        timer = null;
        return true;
    }
}
