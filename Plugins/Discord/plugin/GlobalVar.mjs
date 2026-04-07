let client = null;
let LoginState = {
  logining: false,
  hasLogin: false,
  timer: 0,
  loginState: 0,
  failCount: 0,
  refreshTokenCout: 0,
  appState: false,
};
let plugin = null;
let state = {
  client,
  LoginState,
  plugin,
};
export default state;
