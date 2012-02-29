var ec2ui_client = {
    handler : null,
    uri     : null,
    auxObj  : null,
    serviceURL : null,
    region : null,
    elbURL  : null,
    accessCode : null,
    secretKey : null,
    errorCount: 0,
    timers : {},

    NAME: 'ElasticWolf',
    VERSION: '1.19',
    API_VERSION : '2011-12-15',
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
            this.region = endpoint.name;
            this.elbURL = "https://elasticloadbalancing."+this.region+".amazonaws.com";
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

        var timerKey = strSig+":"+formattedTime;
        return this.sendRequest(xmlhttp, queryParams, isSync, timerKey, reqType, objActions, callback);
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

    queryS3Prepare : function(method, bucket, path, params, content) {
        var curTime = new Date().toUTCString();
        var url = "https://" + (bucket ? bucket + "." : "") + ec2ui_prefs.getS3Region(this.region || "").url;

        if (!params) params = {}

        // Required headers
        if (!params["Content-Type"]) params["Content-Type"] = "binary/octet-stream";
        if (!params["Content-MD5"]) params["Content-MD5"] = "";
        if (!params["Date"]) params["Date"] = curTime;
        if (!params["Content-Length"]) params["Content-Length"] = content ? content.length : 0;

        // Construct the string to sign and query string
        var strSig = method + "\n" +
                     params['Content-MD5'] + "\n" +
                     params['Content-Type'] + "\n" +
                     params['Date'] + "\n";

        // Amazon canonical headers
        var headers = []
        for (var p in params) {
            if (/X-AMZ-/i.test(p)) {
                var value = params[p]
                if (value instanceof Array) {
                    value = value.join(',');
                }
                headers.push(p.toString().toLowerCase() + ':' + value);
            }
        }
        if (headers.length) {
            strSig += headers.sort().join('\n') + "\n"
        }

        // Split query string for subresources, supported are:
        var resources = ["acl", "lifecycle", "location", "logging", "notification", "partNumber", "policy", "requestPayment", "torrent",
                         "uploadId", "uploads", "versionId", "versioning", "versions", "website",
                         "delete",
                         "response-content-type", "response-content-language", "response-expires",
                         "response-cache-control", "response-content-disposition", "response-content-encoding" ]
        var rclist = []
        var query = parseQuery(path)
        for (var p in query) {
            p = p.toLowerCase();
            if (resources.indexOf(p) != -1) {
                rclist.push(p + (query[p] == true ? "" : "=" + query[p]))
            }
        }
        strSig += "/" + (bucket ?  bucket + "/" : "")  + (rclist.length ? "?" : "") + rclist.sort().join("&");

        params["Authorization"] = "AWS " + this.accessCode + ":" + b64_hmac_sha1(this.secretKey, strSig);
        params["User-Agent"] = this.getUserAgent();
        params["Connection"] = "close";

        debug("S3 [" + method + " " + url + " " + path + "|" + strSig.replace(/\n/g, "|") + "]")

        return { url: url + path, headers: params, sig: strSig, time: curTime }
    },

    queryS3Impl : function(method, bucket, path, params, content, objActions, isSync, reqType, callback) {

        var req = this.queryS3Prepare(method, bucket, path, params, content);

        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return null;
        }
        xmlhttp.open(method, req.url, !isSync);

        for (var p in req.headers) {
            xmlhttp.setRequestHeader(p, req.headers[p]);
        }

        var timerKey = req.sig + ":" + req.time;
        return this.sendRequest(xmlhttp, content, isSync, timerKey, reqType, objActions, callback, bucket);
    },

    downloadS3 : function (method, bucket, path, params, file, callback) {
        var req = this.queryS3Prepare(method, bucket, path, params, null);
        this.download(req.url, req.headers, file, callback);
    },

    queryS3 : function (method, bucket, path, params, content, objActions, isSync, reqType, callback) {
        var rsp = null;
        while(true) {
            try {
                rsp = this.queryS3Impl(method, bucket, path, params, content, objActions, isSync, reqType, callback);
                if (rsp.hasErrors) {
                    // Prevent from showing error dialog on every error until success, this happens in case of wrong credentials or endpoint and until all views not refreshed
                    this.errorCount++;
                    if (this.errorCount < 5) {
                        if (!this.errorDialog("S3 responded with an error for "+ method + " " + bucket + "/" + path, rsp.faultCode, rsp.requestId,  rsp.faultString)) {
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
                alert ("An error occurred while calling "+ method + " " + bucket + "/" + path + "\n"+e);
                rsp = null;
                break;
            }
        }
        return rsp;
    },

    sendRequest: function(xmlhttp, content, isSync, timerKey, reqType, objActions, callback, data) {
        var me = this;

        if (isSync) {
            xmlhttp.onreadystatechange = empty;
        } else {
            xmlhttp.onreadystatechange = function () { me.handleAsyncResponse(xmlhttp, callback, reqType, objActions, data); }
        }
        this.startTimer(timerKey, 30000, xmlhttp.abort);

        try {
            xmlhttp.send(content);
            this.stopTimer(timerKey);
        } catch(e) {
            if (isSync && !this.stopTimer(timerKey)) {
                // A timer didn't exist, this is unexpected
                throw e;
            }
            var faultStr = "Please check your EC2/S3 URL for correctness and retry.";
            return this.newResponseObject(null, callback, reqType, true, "Request Error", faultStr, "", data);
        }
        // Process the response
        return this.processXMLHTTPResponse(xmlhttp, reqType, isSync, timerKey, objActions, callback, data);
    },

    handleAsyncResponse : function(xmlhttp, callback, reqType, objActions, data) {
        if (xmlhttp.readyState == 4) {
            var responseObject = null;
            log("Async Response = " + xmlhttp.status + ", response: " + xmlhttp.responseText);
            if (xmlhttp.status >= 200 && xmlhttp.status < 300) {
                responseObject = this.newResponseObject(xmlhttp, callback, reqType, false, "", "", "", data);
            } else {
                log("Generating ASync Failure Response");
                responseObject = this.unpackXMLErrorRsp(xmlhttp, reqType, callback, data);
            }
            responseObject.isAsync = true;
            objActions.onResponseComplete(responseObject);
            return responseObject;
        }
    },

    newResponseObject : function(xmlhttp, callback, reqType, hasErrors, faultCode, faultString, requestId, data) {
        var xmlDoc = (xmlhttp) ? xmlhttp.responseXML : null;
        var strHeaders = (xmlhttp) ? xmlhttp.getAllResponseHeaders() : null;

        return { xmlhttp : xmlhttp, xmlDoc: xmlDoc, strHeaders: strHeaders, callback: callback, requestType : reqType, faultCode : faultCode, requestId : requestId, faultString : faultString, hasErrors : hasErrors, data: data };
    },

    processXMLHTTPResponse : function(xmlhttp, reqType, isSync, timerKey, objActions, callback, data) {
        if (isSync) {
            log("Sync Response = " + xmlhttp.status + "("+xmlhttp.readyState+"): " + xmlhttp.responseText);

            if (xmlhttp.status >= 200 && xmlhttp.status < 300) {
                log("Generating Sync Success Response");
                var resp = this.newResponseObject(xmlhttp, callback, reqType, false, "", "", "", data);
                if (objActions) {
                    objActions.onResponseComplete(resp);
                }
                return resp;
            } else {
                log("Generating Sync Failure Response");
                return this.unpackXMLErrorRsp(xmlhttp, reqType, callback, data);
            }
        } else {
            return {hasErrors:false};
        }
    },

    unpackXMLErrorRsp : function(xmlhttp, reqType, callback, data) {
        var faultCode = "Unknown";
        var faultString = "An unknown error occurred.";
        var requestId = "";
        var xmlDoc = xmlhttp.responseXML;

        if (!xmlDoc) {
            if (xmlhttp.responseText) {
                xmlDoc = new DOMParser().parseFromString(xmlhttp.responseText, "text/xml");
            }
        }

        if (xmlDoc) {
            faultCode = getNodeValueByName(xmlDoc, "Code");
            faultString = getNodeValueByName(xmlDoc, "Message");
            requestId = getNodeValueByName(xmlDoc, "RequestID");
        }

        log("Generated New Error Response Object");
        return this.newResponseObject(xmlhttp, callback, reqType, true, faultCode, faultString, requestId, data);
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

    download: function(url, headers, filename, callback) {
        debug('download: ' + url + '| ' + JSON.stringify(headers) + '| ' + filename)

        try {
          FileIO.remove(filename);
          var file = FileIO.open(filename);
          if (!FileIO.create(file)) {
              alert('Cannot create ' + filename)
              return false;
          }

          var io = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newURI(url, null, null);
          var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
          persist.persistFlags = Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
          persist.progressListener = {
            onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
                window.status =  (aCurTotalProgress/aMaxTotalProgress)*100 + "%";
            },
            onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
                debug("download: " + aStateFlags + " " + aStatus)
                if (aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
                    if (callback) callback();
                }
            }
          }

          var hdrs = "";
          for (var p in headers) {
              hdrs += p + ":" + headers[p] + "\n";
          }
          persist.saveURI(io, null, null, null, hdrs, file);
          return true;

        } catch (e) {
          alert(e);
        }
        return false;
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
