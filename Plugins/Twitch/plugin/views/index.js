if (
  document.location != undefined &&
  document.location != null &&
  document.location.hash != null &&
  document.location.hash != undefined &&
  document.location.hash != ""
) {
  console.log(document.location);
  const searchParams = new URLSearchParams(document.location.hash.substring(1));
  // 获取查询参数
  const access_token = searchParams.get("access_token");
  const id_token = searchParams.get("id_token");
  const scope = searchParams.get("scope");
  const state = searchParams.get("state");
  const token_type = searchParams.get("token_type");

  const data = {
    access_token: access_token,
    id_token: id_token,
    scope: scope,
    state: state,
    token_type: token_type,
  };
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
  console.log("我执行到这里了！");
  fetch("http://localhost:3000/settings?time=" + Date.now(), requestOptions)
    .then((response) => response.json())
    .then((data) => {
      console.log("data.message");
      if (data.message === "false") {
        window.location.href = "/404";
      } else {
        document.getElementById("authWait").style.display = "none";
        document.getElementById("authorization").style.display = "block";
      }
    })
    .catch((error) => console.error("Error:", error));
} else {
  document.getElementById("authWait").style.display = "none";
  document.getElementById("unAuth").style.display = "block";
}
