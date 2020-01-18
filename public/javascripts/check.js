console.log('*****************');

function parseJwt(token) {
  var base64Url = token.split(".")[1];
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  var jsonPayload = decodeURIComponent(
    atob(base64)
    .split("")
    .map(function(c) {
      return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
    })
    .join("")
  );
  return JSON.parse(jsonPayload);
}

function check() {
  var pathname = window.location.pathname;

  // console.log(pathname);

  console.log(' > ', localStorage.getItem("Jwt"));


  var pathcheck = pathname + '/check';
  var xhr = new XMLHttpRequest();

  if (pathname === '/demo/eu-funding' || pathname === '/notary') {
    console.log(pathname);
    xhr.open("POST", pathcheck, true);
    // xhr.open("POST", "/demo/eu-funding/check", true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
      Jwt: localStorage.getItem("Jwt"),
      Did: localStorage.getItem("Did")
    }));
  }


}

check()
