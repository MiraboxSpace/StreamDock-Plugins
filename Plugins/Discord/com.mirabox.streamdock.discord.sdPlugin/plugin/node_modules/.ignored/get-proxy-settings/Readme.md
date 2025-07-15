**Note: This project is not actively maintained. If some issues come up we'll look into fixing them but new features will most likely not make it.**

# System Proxy
[![Build Status](https://travis-ci.org/Azure/get-proxy-settings.svg?branch=master)](https://travis-ci.org/Azure/get-proxy-settings)
[![npm version](https://badge.fury.io/js/get-proxy-settings.svg)](https://badge.fury.io/js/get-proxy-settings)

This library support
- Reading proxy settings from the `HTTP_PROXY` or `HTTPS_PROXY` environment variables
- Reading proxy settings from the `HTTP_PROXY` or `HTTPS_PROXY` node configuration
- Retrieving the settings from the internet settings on Windows in the registry
- Validating the connection and asking for credentials if needed
- Note that it doesn't support every proxy system. If you are using electron it is recommended to use electron/chromium built in proxy support which is much more advanced.

## Install

```
npm install --save get-proxy-settings
```

## Usage

**Import**
```js
// With named import
import { getProxySettings, getAndTestProxySettings } from "get-proxy-settings";

// Or with commonjs
const { getProxySettings, getAndTestProxySettings } = require("get-proxy-settings");
```

**Use**
```js

async function basic() {
    const proxy = await getProxySettings();
    console.log("proxy", proxy.http, proxy.https);
}

// Get and validate the proxy settings
async function withValidation() {
    async function login() {
        // Do any async operation to retrieve the username and password of the user(prompt?)
        return {username: "abc", password: "123"}
    }

    const proxy = await getAndTestProxySettings(login);
    console.log("proxy", proxy.http, proxy.https);
}
```

## Config

Update the test url (Which url is used to validate the proxy)
```js
import { defaults } from "get-proxy-settings";

defaults.testUrl = "https://example.com";
```

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Credits

- [Timothee Guerin](https://github.com/Azure/timotheeguerin)
- Adar Zandberg from the CxSCA AppSec team at Checkmarx. (Finding Command injection vulnerability)
