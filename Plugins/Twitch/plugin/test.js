const axios = require("axios");
async function test() {
  console.log(
    await axios.post(
      "https://api.twitch.tv/helix/streams/markers",
      //参数列表
      { user_id: "1347551992" },
      {
        //请求头配置
        headers: {
          Authorization: "Bearer 330qg53ysels0j4j35z7vqqvbeaekx",
          "Client-Id": "6228vaod9xrmhqvjuu1r8sir52xwyj",
          "Content-Type": "application/json",
        },
      }
    )
  );
}

test();
