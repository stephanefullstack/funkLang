var words = require("shellwords");
var url = require("url");

// TODO -F, --form
// TODO --data-binary
// TODO --data-urlencode
// TODO -r, --range

/**
 * Attempt to parse the given curl string.
 */

module.exports = exports.default = function(s) {
    if (0 != s.indexOf("curl ")) return;
    var args = rewrite(words.split(s));
    var out = { method: "GET", header: {} };
    var state = "";
    var boundary = "";
    args.forEach(function(arg) {
        switch (true) {
            case isURL(arg):
                out.url = arg;
                break;

            case arg == "-A" || arg == "--user-agent":
                state = "user-agent";
                break;

            case arg == "-H" || arg == "--header":
                state = "header";
                break;

            case arg == "-d" || arg == "--data" || arg == "--data-ascii":
                state = "data";
                break;

            case arg == "-u" || arg == "--user":
                state = "user";
                break;

            case arg == "-I" || arg == "--head":
                out.method = "HEAD";
                break;

            case arg == "-X" || arg == "--request":
                state = "method";
                break;

            case arg == "-b" || arg == "--cookie":
                state = "cookie";
                break;
            case arg == "--data-binary":
                state = "form";
                break;
            case arg == "--data-raw":
                state = "form";
                break;
            case arg == "--compressed":
                out.header["Accept-Encoding"] =
                    out.header["Accept-Encoding"] || "deflate, gzip";
                break;

            case !!arg:
                switch (state) {
                    case "header":
                        var field = parseField(arg);
                        out.header[field[0]] = field[1];
                        if (field[0] == "Content-Type") {
                            if ((match = field[1].match(/boundary=(.*?)$/)))
                                boundary = match[1];
                        }
                        state = "";
                        break;
                    case "user-agent":
                        out.header["User-Agent"] = arg;
                        state = "";
                        break;
                    case "form":
                        // adjust method if it's not matchign with the form data
                        // curl derives that it needs to use post whenever we use form data
                        if (out.method == "GET" || out.method == "HEAD")
                            out.method = "POST";

                        // try parsing input as JSON
                        try {
                            out.body = JSON.parse(arg);
                            break;
                        } catch (e) {}

                        // otherwise assume we are posting a form
                        out.header["Content-Type"] =
                            out.header["Content-Type"] ||
                            "application/x-www-form-urlencoded";
                        form_data = arg.split("form-data;");
                        if (typeof window != "undefined") {
                            re = new RegExp(
                                '^\\sname="(.*)"\\\\r\\\\n\\\\r\\\\n(.*?)\\\\r\\\\n--' +
                                    boundary
                            );
                        } else {
                            re = new RegExp(
                                '^\\sname="(.*)"\\r\\n\\r\\n(.*?)\\r\\n--' +
                                    boundary
                            );
                        }

                        out.body = {};
                        for (var index in form_data) {
                            if (index == 0) continue;
                            var string = form_data[index];
                            if ((m = re.exec(string))) {
                                out.body[m[1]] = m[2];
                            } else {
                                // Upload file
                                if (typeof window != "undefined") {
                                    re2 = new RegExp(
                                        '^\\sname="(.*)";.*?filename="(.*?)"\\\\r\\\\n(.*?)\\\\r\\\\n\\\\r\\\\n\\\\r\\\\n--' +
                                            boundary
                                    );
                                } else {
                                    re2 = new RegExp(
                                        '^\\sname="(.*)";.*?filename="(.*?)"\\r\\n(.*?)\\r\\n\\r\\n\\r\\n--' +
                                            boundary
                                    );
                                }
                                if ((m = re2.exec(string))) {
                                    out.body[m[1]] = { filename: m[2] };
                                }
                            }
                        }
                        state = "";
                        break;
                    case "data":
                        if (out.method == "GET" || out.method == "HEAD")
                            out.method = "POST";
                        out.header["Content-Type"] =
                            out.header["Content-Type"] ||
                            "application/x-www-form-urlencoded";
                        out.body = out.body ? out.body + "&" + arg : arg;
                        state = "";
                        break;
                    case "user":
                        out.header["Authorization"] = "Basic " + btoa(arg);
                        state = "";
                        break;
                    case "method":
                        out.method = arg;
                        state = "";
                        break;
                    case "cookie":
                        out.header["Set-Cookie"] = arg;
                        state = "";
                        break;
                }
                break;
        }
    });
    return out;
};

/**
 * Rewrite args for special cases such as -XPUT.
 */

function rewrite(args) {
    return args.reduce(function(args, a) {
        if (0 == a.indexOf("-X")) {
            args.push("-X");
            args.push(a.slice(2));
        } else {
            args.push(a);
        }

        return args;
    }, []);
}

/**
 * Parse header field.
 */

function parseField(s) {
    return s.split(/: (.+)/);
}

/**
 * Check if `s` looks like a url.
 */

function isURL(s) {
    // TODO: others at some point
    return /^https?:\/\//.test(s);
}
